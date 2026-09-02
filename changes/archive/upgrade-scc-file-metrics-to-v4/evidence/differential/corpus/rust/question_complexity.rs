fn parse(value: Option<i32>) -> Result<i32, &'static str> {
    let parsed = value.ok_or("missing")?;
    Ok(parsed + 1)
}
