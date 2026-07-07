fn main() {
    let exit = vibe_check::run(
        std::env::args().skip(1),
        std::io::stdout(),
        std::io::stderr(),
    );
    std::process::exit(exit);
}
