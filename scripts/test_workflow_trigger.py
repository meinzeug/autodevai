#!/usr/bin/env python3
"""
Test script to verify GitHub Actions workflows are running properly.
This file is created to trigger workflow execution and confirm cache action fixes.
"""

import datetime
import sys
import platform


def main():
    """Simple test function to verify workflow triggers."""
    print("=" * 60)
    print("GitHub Actions Workflow Test")
    print("=" * 60)
    
    # Print system information
    print(f"Timestamp: {datetime.datetime.now().isoformat()}")
    print(f"Python Version: {sys.version}")
    print(f"Platform: {platform.platform()}")
    print(f"Processor: {platform.processor() or 'Unknown'}")
    
    # Perform simple calculations to ensure script runs
    test_values = [1, 2, 3, 4, 5]
    total = sum(test_values)
    average = total / len(test_values)
    
    print(f"\nTest Calculation:")
    print(f"Values: {test_values}")
    print(f"Sum: {total}")
    print(f"Average: {average:.2f}")
    
    # Success message
    print("\n✅ Test script executed successfully!")
    print("This confirms the workflow can be triggered by new commits.")
    print("=" * 60)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())