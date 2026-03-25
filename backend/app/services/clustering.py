from __future__ import annotations

from functools import lru_cache
from math import sqrt
from typing import Optional

from app.models.domain import CategoryType, FinancialItem

try:
    from sentence_transformers import SentenceTransformer
except Exception:  # pragma: no cover - import failure handled with fallback
    SentenceTransformer = None


class SemanticObligationClassifier:
    """
    Embedding-based classifier for vendor names using MiniLM sentence embeddings.
    """

    MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

    _CATEGORY_PROTOTYPES = {
        CategoryType.fixed: [
            "monthly office rent and lease payment",
            "employee payroll and salaries",
            "business insurance premium",
            "loan repayment and debt servicing",
            "internet utility and recurring subscriptions",
        ],
        CategoryType.flexible: [
            "office supplies and discretionary tools",
            "one-time software add-ons",
            "team meals and travel reimbursement",
            "non-essential spending that can be delayed",
            "small purchases with low switching cost",
        ],
        CategoryType.strategic: [
            "growth marketing and customer acquisition",
            "product development and R&D investment",
            "specialized consulting and strategic advisory",
            "sales enablement and expansion initiatives",
            "investments tied to long-term business advantage",
        ],
    }

    def __init__(self) -> None:
        if SentenceTransformer is None:
            raise RuntimeError("sentence-transformers is not available")

        self._model = SentenceTransformer(self.MODEL_NAME)
        self._prototype_embeddings = {
            category: self._model.encode(texts, normalize_embeddings=True)
            for category, texts in self._CATEGORY_PROTOTYPES.items()
        }

    def classify(self, item: FinancialItem) -> CategoryType:
        vendor_context = self._build_vendor_context(item)
        query_embedding = self._model.encode(vendor_context, normalize_embeddings=True)

        best_category = CategoryType.flexible
        best_score = float("-inf")

        for category, prototype_vectors in self._prototype_embeddings.items():
            score = self._max_cosine_similarity(query_embedding, prototype_vectors)
            if score > best_score:
                best_score = score
                best_category = category

        return best_category

    @staticmethod
    def _build_vendor_context(item: FinancialItem) -> str:
        return (
            f"Vendor: {item.name}. "
            f"Type: SMB payable obligation. "
            f"Amount: {item.amount}. "
            "Classify as fixed, flexible, or strategic spending."
        )

    @staticmethod
    def _max_cosine_similarity(query_embedding, prototype_embeddings) -> float:
        max_similarity = float("-inf")
        for vector in prototype_embeddings:
            similarity = _cosine_similarity(query_embedding, vector)
            if similarity > max_similarity:
                max_similarity = similarity
        return max_similarity


@lru_cache(maxsize=1)
def _get_semantic_classifier() -> Optional[SemanticObligationClassifier]:
    try:
        return SemanticObligationClassifier()
    except Exception:
        return None


def _keyword_cluster(item_name: str) -> Optional[CategoryType]:
    name_lower = item_name.lower()

    fixed_keywords = ["rent", "lease", "loan", "salary", "payroll", "insurance"]
    strategic_keywords = ["marketing", "ads", "r&d", "consulting"]

    if any(keyword in name_lower for keyword in fixed_keywords):
        return CategoryType.fixed

    if any(keyword in name_lower for keyword in strategic_keywords):
        return CategoryType.strategic

    return None


def cluster_obligation(item: FinancialItem) -> CategoryType:
    """
    Hybrid classifier:
    1) deterministic keywords for high-confidence known obligations.
    2) semantic embedding fallback for previously unmapped vendors.
    """
    keyword_category = _keyword_cluster(item.name)
    if keyword_category is not None:
        return keyword_category

    semantic_classifier = _get_semantic_classifier()
    if semantic_classifier is not None:
        return semantic_classifier.classify(item)

    # Safe fallback when embeddings/model are unavailable.
    return CategoryType.flexible


def cluster_all(items: list[FinancialItem]) -> list[FinancialItem]:
    for item in items:
        if item.category == CategoryType.unassigned or item.category is None:
            item.category = cluster_obligation(item)
    return items


def _cosine_similarity(vec_a, vec_b) -> float:
    dot_product = 0.0
    norm_a = 0.0
    norm_b = 0.0

    for value_a, value_b in zip(vec_a, vec_b):
        dot_product += float(value_a) * float(value_b)
        norm_a += float(value_a) * float(value_a)
        norm_b += float(value_b) * float(value_b)

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    return dot_product / (sqrt(norm_a) * sqrt(norm_b))
