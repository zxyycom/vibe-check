__global__ void addOne(int *values) {
  values[threadIdx.x] += 1;
}
