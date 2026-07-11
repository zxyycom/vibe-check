pub fn free(a: i32, b: i32, c: i32, d: i32) -> i32 {
    a + b + c + d
}

pub fn outer(seed: i32) -> i32 {
    fn nested(a: i32, b: i32, c: i32, d: i32, e: i32) -> i32 {
        a + b + c + d + e
    }

    nested(seed, 2, 3, 4, 5)
}

pub struct Service;

impl Service {
    pub fn method(&self, a: i32, b: i32, c: i32, d: i32) -> i32 {
        a + b + c + d
    }

    pub fn typed_receiver(self: Box<Self>, a: i32, b: i32, c: i32, d: i32) -> i32 {
        a + b + c + d
    }
}

pub trait Defaulted {
    fn signature(&self, a: i32, b: i32, c: i32, d: i32, e: i32) -> i32;

    fn provided(&mut self, a: i32, b: i32, c: i32, d: i32, e: i32) -> i32 {
        a + b + c + d + e
    }
}

pub fn owns_closure() {
    let callback = |a: i32, b: i32, c: i32, d: i32, e: i32| a + b + c + d + e;
    let _ = callback(1, 2, 3, 4, 5);
}
