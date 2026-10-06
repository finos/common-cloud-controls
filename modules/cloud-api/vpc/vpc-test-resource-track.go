package vpc

import "strings"

func trackTestResource(ids *[]string, id string) {
	id = strings.TrimSpace(id)
	if id == "" {
		return
	}
	*ids = append(*ids, id)
}

func untrackTestResource(ids *[]string, id string) {
	id = strings.TrimSpace(id)
	if id == "" || ids == nil || len(*ids) == 0 {
		return
	}
	kept := (*ids)[:0]
	for _, existing := range *ids {
		if existing != id {
			kept = append(kept, existing)
		}
	}
	*ids = kept
}

func drainTrackedTestResources(ids *[]string) []string {
	if ids == nil || len(*ids) == 0 {
		return nil
	}
	out := append([]string(nil), *ids...)
	*ids = nil
	return out
}
