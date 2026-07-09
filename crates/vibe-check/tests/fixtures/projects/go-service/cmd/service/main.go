package main

import "fmt"

type Service struct {
	Name string
	Port int
}

func main() {
	service := Service{Name: "fixture-go-service", Port: 8080}
	fmt.Printf("%s listening on %d\n", service.Name, service.Port)
}
