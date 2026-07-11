def free(a, b, c, d):
    return a + b + c + d


async def async_free(a, b, c, d, e):
    return a + b + c + d + e


def outer(seed):
    def nested(a, b, c, d, e):
        return a + b + c + d + e

    return nested(seed, 2, 3, 4, 5)


class Service:
    def __init__(self, a, b, c, d, e):
        self.values = (a, b, c, d, e)

    def method(self, a, b, c, d):
        return a + b + c + d

    @classmethod
    def make(cls, a, b, c, d):
        return cls(a, b, c, d, 5)

    @staticmethod
    def static(a, b, c, d, e):
        return a + b + c + d + e

    def compound(self, first=1, second: int = 2, *args, **kwargs):
        return first, second, args, kwargs


callbacks = [lambda a, b, c, d, e: a + b + c + d + e]
