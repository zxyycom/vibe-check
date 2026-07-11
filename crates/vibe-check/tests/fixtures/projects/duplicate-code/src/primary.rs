fn calculate_invoice(values: &[i64]) -> i64 {
    let mut total = 0;
    let mut index = 0;
    while index < values.len() {
        let value = values[index];
        let adjusted = value * 3 + 7;
        if adjusted % 2 == 0 {
            total += adjusted / 2;
        } else {
            total += adjusted * 2;
        }
        index += 1;
    }
    total
}
