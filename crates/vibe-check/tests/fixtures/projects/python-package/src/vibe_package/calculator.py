from dataclasses import dataclass


@dataclass(frozen=True)
class Invoice:
    subtotal: int
    tax: int


def total_due(invoice: Invoice) -> int:
    return invoice.subtotal + invoice.tax
