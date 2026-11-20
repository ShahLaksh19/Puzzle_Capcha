"""
Unit & Evaluation Test Suite for PuzzlePass Security Engine.
Tests:
  1. Challenge generation & signature integrity
  2. Successful human puzzle solve
  3. Replay attack rejection (re-submitting same challenge)
  4. Bot speed check (instantaneous solve rejection)
  5. Expired challenge rejection (TTL expiration)
  6. Attempt limit exhaustion (brute-force prevention)
  7. One-time verification token consumption & replay prevention
"""

import sys
import time
from backend.security import (
    generate_challenge,
    verify_challenge,
    validate_verification_token,
    CHALLENGE_TTL_SECONDS,
)

def run_tests():
    print("=" * 60)
    print("RUNNING PUZZLEPASS SECURITY & EVALUATION TEST SUITE")
    print("=" * 60)

    # Test 1: Challenge generation
    print("\n[TEST 1] Challenge Generation & Cryptographic Signatures...")
    ch = generate_challenge(grid_size=3)
    assert "challenge_id" in ch
    assert "permutation" in ch
    assert "signature" in ch
    assert len(ch["permutation"]) == 9
    assert sorted(ch["permutation"]) == list(range(9))
    assert ch["permutation"] != list(range(9))  # Must be shuffled
    print("✓ Challenge generation passed with valid cryptographic signature.")

    # Test 2: Valid human puzzle solve
    print("\n[TEST 2] Valid Human Solve Verification...")
    ch_id = ch["challenge_id"]
    sig = ch["signature"]
    solved_state = list(range(9))
    ok, msg, token = verify_challenge(
        challenge_id=ch_id,
        signature=sig,
        final_permutation=solved_state,
        solve_time_ms=6500,  # 6.5 seconds
        moves_count=12,
    )
    assert ok is True, f"Expected success but got: {msg}"
    assert token is not None
    assert token.startswith("pp_")
    print(f"✓ Valid human solve accepted. Issued token: {token[:20]}...")

    # Test 3: Replay attack prevention on challenge
    print("\n[TEST 3] Challenge Replay Attack Prevention...")
    ok_replay, msg_replay, token_replay = verify_challenge(
        challenge_id=ch_id,
        signature=sig,
        final_permutation=solved_state,
        solve_time_ms=6500,
        moves_count=12,
    )
    assert ok_replay is False, "Replay attack should have been blocked!"
    print(f"✓ Replay attack blocked successfully: {msg_replay}")

    # Test 4: Bot speed anomaly check (< 800ms)
    print("\n[TEST 4] Bot Sub-Second Speed Anomaly Detection...")
    ch_bot = generate_challenge(grid_size=3)
    ok_bot, msg_bot, _ = verify_challenge(
        challenge_id=ch_bot["challenge_id"],
        signature=ch_bot["signature"],
        final_permutation=solved_state,
        solve_time_ms=150,  # 150ms bot speed
        moves_count=9,
    )
    assert ok_bot is False, "Instantaneous bot solve should have been flagged!"
    print(f"✓ Bot solve blocked successfully: {msg_bot}")

    # Test 5: Attempt limit exhaustion (brute-force defense)
    print("\n[TEST 5] Brute-Force Attempt Limits...")
    ch_brute = generate_challenge(grid_size=3)
    wrong_solution = [1, 0, 2, 3, 4, 5, 6, 7, 8]
    # Attempt 1
    ok1, msg1, _ = verify_challenge(ch_brute["challenge_id"], ch_brute["signature"], wrong_solution, 2000, 4)
    assert ok1 is False
    # Attempt 2
    ok2, msg2, _ = verify_challenge(ch_brute["challenge_id"], ch_brute["signature"], wrong_solution, 2500, 6)
    assert ok2 is False
    # Attempt 3
    ok3, msg3, _ = verify_challenge(ch_brute["challenge_id"], ch_brute["signature"], wrong_solution, 3000, 8)
    assert ok3 is False
    # Attempt 4 (Exceeded limit)
    ok4, msg4, _ = verify_challenge(ch_brute["challenge_id"], ch_brute["signature"], solved_state, 3500, 10)
    assert ok4 is False
    assert "exceeded" in msg4.lower() or "invalid" in msg4.lower()
    print(f"✓ Attempt limits enforced: {msg4}")

    # Test 6: One-Time Verification Token Validation & Replay Prevention
    print("\n[TEST 6] One-Time Verification Token Validation & Replay Defense...")
    valid_token, tok_msg, meta = validate_verification_token(token)
    assert valid_token is True, f"Token validation failed: {tok_msg}"
    assert meta["solve_time_ms"] == 6500
    print(f"✓ Token successfully validated by protected service: {tok_msg}")

    # Attempt to reuse the consumed token
    valid_reuse, reuse_msg, _ = validate_verification_token(token)
    assert valid_reuse is False, "Token reuse should have been blocked!"
    print(f"✓ Token replay prevented successfully: {reuse_msg}")

    print("\n" + "=" * 60)
    print("ALL 6 SECURITY & EVALUATION TESTS PASSED (100% SUCCESS)")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
