package preview

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

type Renderer struct {
	command    []string
	scriptPath string
}

func New() (*Renderer, error) {
	if execPath := os.Getenv("RENDERER_EXEC"); execPath != "" {
		return &Renderer{
			command:    []string{execPath},
			scriptPath: "",
		}, nil
	}

	// Try to find the compiled executable first
	exePath, err := defaultExePath()
	if err == nil {
		if _, err := os.Stat(exePath); err == nil {
			return &Renderer{
				command:    []string{exePath},
				scriptPath: "",
			}, nil
		}
	}

	// Fallback to Python script
	command, err := findPython()
	if err != nil {
		return nil, err
	}

	scriptPath, err := defaultScriptPath()
	if err != nil {
		return nil, err
	}

	return &Renderer{
		command:    command,
		scriptPath: scriptPath,
	}, nil
}

func defaultExePath() (string, error) {
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		return "", errors.New("resolve renderer path")
	}

	// On Windows, use .exe extension
	exeName := "render_pdf_cover"
	if runtime.GOOS == "windows" {
		exeName += ".exe"
	}

	return filepath.Clean(filepath.Join(filepath.Dir(currentFile), "..", "..", "scripts", exeName)), nil
}

func (r *Renderer) RenderFirstPage(ctx context.Context, pdfPath, outputPath string) error {
	args := append([]string{}, r.command[1:]...)
	if r.scriptPath != "" {
		args = append(args, r.scriptPath)
	}
	args = append(args, pdfPath, outputPath)
	
	command := exec.CommandContext(ctx, r.command[0], args...)
	output, err := command.CombinedOutput()
	if err != nil {
		return fmt.Errorf("render cover preview: %w: %s", err, string(output))
	}
	return nil
}

func defaultScriptPath() (string, error) {
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		return "", errors.New("resolve renderer path")
	}

	return filepath.Clean(filepath.Join(filepath.Dir(currentFile), "..", "..", "scripts", "render_pdf_cover.py")), nil
}

func findPython() ([]string, error) {
	candidates := [][]string{
		{"py", "-3"},
		{"python3"},
		{"python"},
	}

	for _, candidate := range candidates {
		path, err := exec.LookPath(candidate[0])
		if err == nil {
			candidate[0] = path
			return candidate, nil
		}
	}

	return nil, errors.New("python runtime not found")
}
