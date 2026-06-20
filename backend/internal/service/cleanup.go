package service

import (
	"context"
	"time"
)

func (s *Service) CleanupDeletedItems(ctx context.Context) error {
	threshold := time.Now().AddDate(0, 0, -7)

	// 1. (Оставлено пустым) удаленные документы хранятся в архиве бессрочно.
	// Ранее здесь был код, который удалял их через 7 дней.

	// 2. Hard delete old rejected submissions
	subs, err := s.repo.GetRejectedSubmissionsForCleanup(ctx, threshold)
	if err != nil {
		return err
	}
	for _, sub := range subs {
		if err := s.repo.HardDeleteSubmission(ctx, sub.ID); err != nil {
			continue
		}
		s.files.Delete(sub.FilePath)
		s.files.Delete(sub.CoverPath)
	}

	return nil
}

func (s *Service) DeactivateInactiveUsers(ctx context.Context) error {
	// 180 days = 6 months
	threshold := time.Now().AddDate(0, 0, -180)
	return s.repo.DeactivateInactiveUsers(ctx, threshold)
}
