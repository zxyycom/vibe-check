package health

type Status struct {
	Ready bool
	Note  string
}

func Check() Status {
	return Status{
		Ready: true,
		Note:  "fixture service is ready",
	}
}
