package comments

func FourParameters(
	alpha int,
	// This comment must not become a parameter slot.
	beta int,
	gamma int,
	delta int,
) int {
	return alpha + beta + gamma + delta
}
