variable "common_tags" {
  type = map(string)
}

variable "observer_name" {
  type    = string
  default = "finos-public-probe"
}
