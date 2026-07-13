package domain

// ChangePasswordInput is used by a user to change their own password
// OldPassword is required to verify the current password
// NewPassword must be at least 6 characters
// Note: plaintext passwords are never stored

type ChangePasswordInput struct {
	OldPassword string `json:"oldPassword"`
	NewPassword string `json:"newPassword"`
}

// ResetPasswordInput is used by admins to set a new password for another user
// The admin does not see the old password and must provide a new one

type ResetPasswordInput struct {
	Password string `json:"password"`
}
