from __future__ import annotations

import hashlib
from typing import Iterable

import faiss
import numpy as np



class PreferenceMemory:
    def __init__(self, dimensions: int = 128) -> None:
        self.dimensions = dimensions
        self.index = faiss.IndexFlatIP(dimensions)
        self.texts: list[str] = []

    def load(self, preferences: list[str]) -> None:
        self.texts = preferences
        self.index = faiss.IndexFlatIP(self.dimensions)
        if self.texts:
            self.index.add(np.array([self._embed(text) for text in self.texts], dtype="float32"))

    def remember(self, text: str) -> None:
        self.texts.append(text)
        self.index.add(np.array([self._embed(text)], dtype="float32"))

    def search(self, query: str, k: int = 4) -> list[str]:
        if not self.texts:
            return []
        vector = np.array([self._embed(query)], dtype="float32")
        _, indices = self.index.search(vector, min(k, len(self.texts)))
        return [self.texts[index] for index in indices[0] if index >= 0]

    def _embed(self, text: str) -> np.ndarray:
        digest = hashlib.sha256(text.lower().encode()).digest()
        repeated = (digest * ((self.dimensions // len(digest)) + 1))[: self.dimensions]
        vector = np.frombuffer(repeated, dtype=np.uint8).astype("float32")
        norm = np.linalg.norm(vector)
        return vector / norm if norm else vector
