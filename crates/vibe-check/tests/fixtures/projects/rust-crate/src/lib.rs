pub struct Widget {
    label: &'static str,
    weight: u32,
}

impl Widget {
    pub fn new(label: &'static str, weight: u32) -> Self {
        Self { label, weight }
    }

    pub fn score(&self) -> u32 {
        self.weight + self.label.len() as u32
    }
}
