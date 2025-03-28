package main

import "testing"

func TestAdd(t *testing.T) {
	tests := []struct {
		a, b, expected string
	}{
		// Basic additions
		{"1.3", "2.57", "3.87"},
		{"2.57", "1.3", "3.87"},
		{"123", "456", "579"},
		{"0", "0", "0"},
		// Mixed signs
		{"-1.3", "2.57", "1.27"},
		{"1.3", "-2.57", "-1.27"},
		{"-1.3", "-2.57", "-3.87"},
		// Fractional arithmetic
		{"0.1", "0.2", "0.3"},
		{"99.99", "0.01", "100"},
		{"12.345", "0.655", "13"}, // trailing zeros removed
		{"0.99", "0.02", "1.01"},
		// With leading zeros in integer parts
		{"001.3", "02.57", "3.87"},
		{"001.3", "02.5700000", "3.87"},
		{"000", "000001", "1"},
		{"0.9999999999999999999999999999999999999999999999", "0.0000000000000000000000000000000000000000000001", "1"},
	}

	for _, tc := range tests {
		result := Add(tc.a, tc.b)
		if result != tc.expected {
			t.Errorf("Add(%q, %q) = %q; expected %q", tc.a, tc.b, result, tc.expected)
		}
	}
}

func TestSubtract(t *testing.T) {
	tests := []struct {
		a, b, expected string
	}{
		// Basic subtractions
		{"2.57", "1.3", "1.27"},
		{"1.3", "2.57", "-1.27"},
		{"456", "123", "333"},
		{"0", "0", "0"},
		// Mixed signs
		{"-1.3", "2.57", "-3.87"},
		{"2.57", "-1.3", "3.87"},
		{"-1.3", "-2.57", "1.27"},
		// Borrowing across the decimal point
		{"1.00", "0.01", "0.99"},
		{"100", "99.99", "0.01"},
		{"100", "99.990000000", "0.01"},
		// Borrowing across integer part digits
		{"1000", "1", "999"},
	}

	for _, tc := range tests {
		result := Subtract(tc.a, tc.b)
		if result != tc.expected {
			t.Errorf("Subtract(%q, %q) = %q; expected %q", tc.a, tc.b, result, tc.expected)
		}
	}
}

func TestNormalize(t *testing.T) {
	tests := []struct {
		input          string
		expectedSign   string
		expectedInt    string
		expectedFrac   string
	}{
		{input: "123.456", expectedSign: "+", expectedInt: "123", expectedFrac: "456"},
		{input: "-123.456", expectedSign: "-", expectedInt: "123", expectedFrac: "456"},
		{input: "123", expectedSign: "+", expectedInt: "123", expectedFrac: ""},
		{input: "-123", expectedSign: "-", expectedInt: "123", expectedFrac: ""},
		{input: "+123.456", expectedSign: "+", expectedInt: "123", expectedFrac: "456"},
		{input: "-0.001", expectedSign: "-", expectedInt: "0", expectedFrac: "001"},
		{input: "0", expectedSign: "+", expectedInt: "0", expectedFrac: ""},
		{input: "0.0", expectedSign: "+", expectedInt: "0", expectedFrac: "0"},
	}

	for _, tc := range tests {
		sign, intPart, fracPart := normalize(tc.input)
		if sign != tc.expectedSign || intPart != tc.expectedInt || fracPart != tc.expectedFrac {
			t.Errorf("normalize(%q) = (%q, %q, %q); expected (%q, %q, %q)", 
				tc.input, sign, intPart, fracPart, 
				tc.expectedSign, tc.expectedInt, tc.expectedFrac)
		}
	}
}


func TestMultiply(t *testing.T) {
	tests := []struct {
		a, b, expected string
	}{
		// Basic multiplications
		{"2", "3", "6"},
		{"0", "123.456", "0"},
		{"123", "0", "0"},
		{"4", "0.25", "1"},
		{"-2", "3", "-6"},
		{"-123.456", "1", "-123.456"},
		// Mixed signs
		{"-2.5", "-4", "10"}, // both negative
		{"2.5", "-4", "-10"},  // one negative
		// Testing decimal multiplication
		{"1.5", "2.5", "3.75"},
		{"0.1", "0.2", "0.02"},
		// Large numbers
		{"123456789", "987654321", "121932631112635269"},
	}
	
	for _, tc := range tests {
		result := Multiply(tc.a, tc.b)
		if result != tc.expected {
			t.Errorf("Multiply(%q, %q) = %q; expected %q", tc.a, tc.b, result, tc.expected)
		}
	}
}



func TestDivide(t *testing.T) {
	tests := []struct {
		a, b, expected string
		precision int
	}{
		// Basic divisions
		{"6", "3", "2", 10},
		{"100", "10", "10", 10},
		{"123.456", "1", "123.456", 10},
		{"1", "3", "0.3333333333", 10}, // Repeating decimal
		{"0", "123.456", "0", 10},
		// Division by zero
		{"123.456", "0", "NaN", 10},
		// Mixed signs
		{"6", "-3", "-2", 10},
		{"-6", "3", "-2", 10},
		{"-6", "-3", "2", 10},
		// Decimal divisions
		{"1.5", "0.3", "5", 10},
		{"0.1", "0.2", "0.5", 10},
		// Large numbers
		{"123456789", "987654321", "0.1249999989", 10},
	}

	for _, tc := range tests {
		result := Divide(tc.a, tc.b, tc.precision)
		if result != tc.expected {
			t.Errorf("Divide(%q, %q, %d) = %q; expected %q", tc.a, tc.b, tc.precision, result, tc.expected)
		}
	}
}

// @@file:"/home/ubuntu/traveledit/src/linescript4/stringmath.go"
