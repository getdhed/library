package service

import (
	"context"
	"os"
	"path/filepath"
	"time"
)

func (s *Service) CleanOldArchives(ctx context.Context, enable bool, days int) error {
	if !enable || days <= 0 {
		return nil
	}

	base := s.files.Resolve("archives")
	entries, err := os.ReadDir(base)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	threshold := time.Now().AddDate(0, 0, -days)
	for _, e := range entries {
		p := filepath.Join(base, e.Name())
		info, err := e.Info()
		if err != nil {
			continue
		}
		if info.ModTime().Before(threshold) {
			_ = os.RemoveAll(p)
		}
	}
	return nil
}
