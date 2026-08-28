package utils

import (
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"fmt"
)

// verifyRS256 — verify RS256 signature on JWT
func verifyRS256(signingInput string, signatureB64 string, pubKey *rsa.PublicKey) error {
	signature, err := base64URLDecode(signatureB64)
	if err != nil {
		return fmt.Errorf("failed to decode signature: %w", err)
	}

	hash := sha256.Sum256([]byte(signingInput))
	return rsa.VerifyPKCS1v15(pubKey, crypto.SHA256, hash[:], signature)
}
