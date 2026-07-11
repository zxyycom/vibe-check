package characterization

type Service struct{}

func Build(a, b int, c string, values ...string) int {
	return a + b + len(c) + len(values)
}

func Threshold(a, b int, c, d string, values ...string) int {
	return a + b + len(c) + len(d) + len(values)
}

func (service *Service) Run(a, b int, c, d string) int {
	return a + b + len(c) + len(d)
}

var callback = func(a, b, c, d, e int) int {
	return a + b + c + d + e
}
