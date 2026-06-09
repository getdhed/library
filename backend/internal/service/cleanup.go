package service

import (
	"context"
	"time"
)

func (s *Service) CleanupDeletedItems(ctx context.Context) error {
	threshold := time.Now().AddDate(0, 0, -7)

	// 1. Hard delete old soft-deleted documents
	docs, err := s.repo.GetDeletedDocumentsForCleanup(ctx, threshold)
	if err != nil {
		return err
	}
	for _, doc := range docs {
		if err := s.repo.HardDeleteDocument(ctx, doc.ID); err != nil {
			continue // Log error in real app, but proceed
		}
		s.files.Delete(doc.FilePath)
		s.files.Delete(doc.CoverPath)
	}

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
