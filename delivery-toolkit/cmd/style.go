package cmd

import (
	"fmt"
	"strings"
)

var (
	// ASCII art logo
	Logo = "\033[34m     _____\033[35m_____\033[36m_____\n\033[34m    / ___/\033[35m ___/\033[36m ___/\n\033[34m   / /  \033[35m/ /  \033[36m/ / \n\033[34m  / /__\033[35m/ /__\033[36m/ /___ \n\033[34m  \\____/\033[35m____/\033[36m____/\n\033[37m"

	// Divider for output formatting
	Divider = fmt.Sprintf("\n%s\n", strings.Repeat("-", 40))
)
