package main

import (
	"fmt"
	"strings"
	"unicode"
)

func removeLeadingZeros(s string) string {
	s = strings.TrimLeft(s, "0")
	if s == "" {
		return "0"
	}
	return s
}

func cmpInt(a, b string) int {
	a = removeLeadingZeros(a)
	b = removeLeadingZeros(b)
	if len(a) > len(b) {
		return 1
	} else if len(a) < len(b) {
		return -1
	} else {
		if a > b {
			return 1
		} else if a < b {
			return -1
		} else {
			return 0
		}
	}
}

func subInt(a, b string) string {
	// a and b are non-negative integer strings and a>=b.
	ai := []byte(a)
	bi := []byte(b)
	// Pad b with leading zeros.
	if len(bi) < len(ai) {
		padding := strings.Repeat("0", len(ai)-len(bi))
		bi = []byte(padding + b)
	}
	carry := 0
	res := make([]byte, len(ai))
	for i := len(ai) - 1; i >= 0; i-- {
		d1 := int(ai[i] - '0')
		d2 := int(bi[i] - '0')
		diff := d1 - d2 - carry
		if diff < 0 {
			diff += 10
			carry = 1
		} else {
			carry = 0
		}
		res[i] = byte(diff + '0')
	}
	return removeLeadingZeros(string(res))
}

func multiplyAbsStrings(a, b string) string {
	// Multiply two non-negative integer strings.
	if a == "0" || b == "0" {
		return "0"
	}
	n := len(a)
	m := len(b)
	res := make([]int, n+m)
	// Multiply digit by digit from right to left.
	for i := n - 1; i >= 0; i-- {
		for j := m - 1; j >= 0; j-- {
			d1 := int(a[i] - '0')
			d2 := int(b[j] - '0')
			sum := res[i+j+1] + d1*d2
			res[i+j+1] = sum % 10
			res[i+j] += sum / 10
		}
	}
	// Convert result to string.
	var sb strings.Builder
	start := 0
	// Skip leading zeros.
	for start < len(res) && res[start] == 0 {
		start++
	}
	for i := start; i < len(res); i++ {
		sb.WriteByte(byte(res[i] + '0'))
	}
	return sb.String()
}

func Multiply(a, b string) string {
	// Normalize numbers.
	aSign, aInt, aFrac := normalize(a)
	bSign, bInt, bFrac := normalize(b)

	// Determine result sign.
	resultSign := "+"
	if aSign != bSign {
		// If either operand is zero, result is zero.
		if (aInt == "0" && strings.Trim(aFrac, "0") == "") || (bInt == "0" && strings.Trim(bFrac, "0") == "") {
			resultSign = "+"
		} else {
			resultSign = "-"
		}
	}

	// Remove decimals: treat numbers as integers.
	// The effective number is the concatenation of intPart and fracPart.
	aDigits := aInt + aFrac
	bDigits := bInt + bFrac

	// Multiply as big integers.
	product := multiplyAbsStrings(aDigits, bDigits)

	// Total number of fractional digits in result.
	totalFrac := len(aFrac) + len(bFrac)

	// Insert decimal point if needed.
	if totalFrac > 0 {
		// Pad with leading zeros if necessary.
		if len(product) <= totalFrac {
			product = strings.Repeat("0", totalFrac-len(product)+1) + product
		}
		pointPosition := len(product) - totalFrac
		intPart := product[:pointPosition]
		fracPart := product[pointPosition:]
		fracPart = strings.TrimRight(fracPart, "0")
		intPart = removeLeadingZeros(intPart)
		if fracPart != "" {
			product = intPart + "." + fracPart
		} else {
			product = intPart
		}
	} else {
		product = removeLeadingZeros(product)
	}

	if product == "0" {
		return "0"
	}
	if resultSign == "-" {
		product = "-" + product
	}
	return product
}

func multiplyBy10(num string) string {
	if num == "0" {
		return "0"
	}
	return num + "0"
}

// New version of divideInts with rounding.
func divideInts(numer, denom string, precision int) string {
	// (Normalization and integer division steps as before…)
	numer = removeLeadingZeros(numer)
	denom = removeLeadingZeros(denom)
	if denom == "0" {
		return "NaN" // division by zero
	}

	// Compute the integer part
	intPart := ""
	rem := ""
	for i := 0; i < len(numer); i++ {
		rem += string(numer[i])
		rem = removeLeadingZeros(rem)
		count := 0
		for cmpInt(rem, denom) >= 0 {
			rem = subInt(rem, denom)
			count++
		}
		intPart += fmt.Sprintf("%d", count)
	}
	intPart = removeLeadingZeros(intPart)

	// If no remainder and no fraction needed, return the integer part.
	if rem == "0" && precision > 0 {
		return intPart
	}

	// Process fractional part: compute one extra digit for rounding.
	fracDigits := make([]byte, precision+1)
	for i := 0; i < precision+1; i++ {
		rem += "0"
		rem = removeLeadingZeros(rem)
		count := 0
		for cmpInt(rem, denom) >= 0 {
			rem = subInt(rem, denom)
			count++
		}
		fracDigits[i] = byte(count + '0')
	}

    if fracDigits[precision] >= '5' {
        // Propagate the rounding in the fraction digits.
        carry := 1
        for i := precision - 1; i >= 0 && carry > 0; i-- {
            d := int(fracDigits[i]-'0') + carry
            carry = d / 10
            fracDigits[i] = byte((d % 10) + '0')
        }
        // If carry is still 1, we need to add one to the integer part.
        if carry == 1 {
            // Use Add to add "1" to intPart.
            intPart = Add(intPart, "1")
            intPart = removeLeadingZeros(intPart)
        }
    }

	// Prepare fraction part up to desired precision (dropping the extra digit)
	fracPart := string(fracDigits[:precision])
	// Trim trailing zeros if needed:
	fracPart = strings.TrimRight(fracPart, "0")

	if fracPart != "" {
		return intPart + "." + fracPart
	}
	return intPart
}

func Divide(a, b string, precision int) string {
	// Normalize numbers.
	aSign, aInt, aFrac := normalize(a)
	bSign, bInt, bFrac := normalize(b)

	// If divisor is zero.
	if bInt == "0" && strings.Trim(bFrac, "0") == "" {
		return "NaN"
	}

	// Determine result sign.
	resultSign := "+"
	if aSign != bSign {
		resultSign = "-"
	}

	// Convert both numbers to integers by removing decimal point.
	// Using the formula: A = (aInt+aFrac) / (10^(len(aFrac))) and B = (bInt+bFrac) / (10^(len(bFrac)))
	// Then A/B = (aDigits * 10^(len(bFrac))) / (bDigits * 10^(len(aFrac)))
	aDigits := removeLeadingZeros(aInt + aFrac)
	bDigits := removeLeadingZeros(bInt + bFrac)

	// Adjust numerator and denominator to account for decimals.
	numZeros := len(bFrac)
	denomZeros := len(aFrac)
	numerator := aDigits + strings.Repeat("0", numZeros)
	denom := bDigits + strings.Repeat("0", denomZeros)

	// Set desired precision for fraction part.
	quotient := divideInts(numerator, denom, precision)

	// Remove trailing dot if any.
	quotient = strings.TrimSuffix(quotient, ".")
	// Remove any redundant leading zeros from integer part.
	if strings.Contains(quotient, ".") {
		parts := strings.SplitN(quotient, ".", 2)
		parts[0] = removeLeadingZeros(parts[0])
		// Remove trailing zeros from fraction.
		parts[1] = strings.TrimRight(parts[1], "0")
		if parts[1] != "" {
			quotient = parts[0] + "." + parts[1]
		} else {
			quotient = parts[0]
		}
	} else {
		quotient = removeLeadingZeros(quotient)
	}

	if quotient == "0" {
		return "0"
	}
	if resultSign == "-" {
		// Prepend '-' if not zero.
		quotient = "-" + quotient
	}
	return quotient
}

// normalize breaks a number string into its sign, integer part and fractional part.
func normalize(num string) (sign, intPart, fracPart string) {
	num = strings.TrimSpace(num)
	if num == "" {
		return "+", "0", ""
	}
	if len(num) > 0 && (num[0] == '-' || num[0] == '+') {
		sign = string(num[0])
		num = num[1:]
	} else {
		sign = "+"
	}
	// Remove any spaces that might be present.
	num = strings.TrimFunc(num, func(r rune) bool { return !unicode.IsDigit(r) && r != '.' })
	parts := strings.Split(num, ".")
	intPart = parts[0]
	if intPart == "" {
		intPart = "0"
	}
	if len(parts) > 1 {
		fracPart = parts[1]
	}
	// Remove any non-digit characters from fracPart.
	fracDigits := ""
	for _, r := range fracPart {
		if unicode.IsDigit(r) {
			fracDigits += string(r)
		}
	}
	fracPart = fracDigits
	return
}

// Add returns the sum of two number strings.
func Add(a, b string) string {
	aSign, aInt, aFrac := normalize(a)
	bSign, bInt, bFrac := normalize(b)

	// Same sign: add absolute values and reapply sign.
	if aSign == bSign {
		intPart, fracPart := addAbs(aInt, aFrac, bInt, bFrac)
		result := intPart
		if fracPart != "" {
			result += "." + fracPart
		}
		if aSign == "-" && result != "0" {
			result = "-" + result
		}
		return result
	}

	// Different signs: convert to subtraction.
	// a + b is equivalent to a - (-b).
	if aSign == "+" {
		// a - |b|
		if compareAbs(aInt, aFrac, bInt, bFrac) >= 0 {
			intPart, fracPart := subtractAbs(aInt, aFrac, bInt, bFrac)
			result := intPart
			if fracPart != "" {
				result += "." + fracPart
			}
			return result
		} else {
			intPart, fracPart := subtractAbs(bInt, bFrac, aInt, aFrac)
			result := intPart
			if fracPart != "" {
				result += "." + fracPart
			}
			if result != "0" {
				result = "-" + result
			}
			return result
		}
	} else {
		// (-a) + b => b - |a|
		if compareAbs(aInt, aFrac, bInt, bFrac) > 0 {
			intPart, fracPart := subtractAbs(aInt, aFrac, bInt, bFrac)
			result := intPart
			if fracPart != "" {
				result += "." + fracPart
			}
			if result != "0" {
				result = "-" + result
			}
			return result
		} else {
			intPart, fracPart := subtractAbs(bInt, bFrac, aInt, aFrac)
			result := intPart
			if fracPart != "" {
				result += "." + fracPart
			}
			return result
		}
	}
}

// Subtract returns the result of subtracting b from a.
func Subtract(a, b string) string {
	// a - b = a + (-b)
	if len(b) > 0 && b[0] == '-' {
		b = b[1:]
	} else {
		b = "-" + b
	}
	return Add(a, b)
}

// addAbs adds the absolute values given by integer and fractional parts.
func addAbs(aInt, aFrac, bInt, bFrac string) (string, string) {
	// Align fractional parts: pad with trailing zeros.
	maxFracLen := len(aFrac)
	if len(bFrac) > maxFracLen {
		maxFracLen = len(bFrac)
	}
	aFrac += strings.Repeat("0", maxFracLen-len(aFrac))
	bFrac += strings.Repeat("0", maxFracLen-len(bFrac))

	carry := 0
	fracRes := make([]byte, maxFracLen)
	// Add fractional digits right-to-left.
	for i := maxFracLen - 1; i >= 0; i-- {
		d1 := int(aFrac[i] - '0')
		d2 := int(bFrac[i] - '0')
		sum := d1 + d2 + carry
		fracRes[i] = byte((sum % 10) + '0')
		carry = sum / 10
	}

	// Align integer parts: pad with leading zeros.
	maxIntLen := len(aInt)
	if len(bInt) > maxIntLen {
		maxIntLen = len(bInt)
	}
	aInt = strings.Repeat("0", maxIntLen-len(aInt)) + aInt
	bInt = strings.Repeat("0", maxIntLen-len(bInt)) + bInt

	intRes := make([]byte, maxIntLen)
	// Add integer digits right-to-left.
	for i := maxIntLen - 1; i >= 0; i-- {
		d1 := int(aInt[i] - '0')
		d2 := int(bInt[i] - '0')
		sum := d1 + d2 + carry
		intRes[i] = byte((sum % 10) + '0')
		carry = sum / 10
	}

	// If a carry remains, prepend it.
	intStr := ""
	if carry > 0 {
		intStr = fmt.Sprintf("%d", carry)
	}
	intStr += string(intRes)

	// Trim any leading zeros.
	intStr = strings.TrimLeft(intStr, "0")
	if intStr == "" {
		intStr = "0"
	}

	// Remove any trailing zeros from the fractional result.
	fracStr := strings.TrimRight(string(fracRes), "0")
	return intStr, fracStr
}

// subtractAbs subtracts the absolute value b from a (assumes a >= b).
func subtractAbs(aInt, aFrac, bInt, bFrac string) (string, string) {
	// Align fractional parts.
	maxFracLen := len(aFrac)
	if len(bFrac) > maxFracLen {
		maxFracLen = len(bFrac)
	}
	aFrac += strings.Repeat("0", maxFracLen-len(aFrac))
	bFrac += strings.Repeat("0", maxFracLen-len(bFrac))

	borrow := 0
	fracRes := make([]byte, maxFracLen)
	// Subtract fractional parts right-to-left.
	for i := maxFracLen - 1; i >= 0; i-- {
		d1 := int(aFrac[i] - '0')
		d2 := int(bFrac[i] - '0')
		diff := d1 - d2 - borrow
		if diff < 0 {
			diff += 10
			borrow = 1
		} else {
			borrow = 0
		}
		fracRes[i] = byte(diff + '0')
	}

	// Align integer parts.
	maxIntLen := len(aInt)
	if len(bInt) > maxIntLen {
		maxIntLen = len(bInt)
	}
	aInt = strings.Repeat("0", maxIntLen-len(aInt)) + aInt
	bInt = strings.Repeat("0", maxIntLen-len(bInt)) + bInt

	intRes := make([]byte, maxIntLen)
	// Subtract integer parts right-to-left.
	for i := maxIntLen - 1; i >= 0; i-- {
		d1 := int(aInt[i] - '0')
		d2 := int(bInt[i] - '0')
		diff := d1 - d2 - borrow
		if diff < 0 {
			diff += 10
			borrow = 1
		} else {
			borrow = 0
		}
		intRes[i] = byte(diff + '0')
	}

	// Remove leading zeros in the integer part.
	intStr := strings.TrimLeft(string(intRes), "0")
	if intStr == "" {
		intStr = "0"
	}
	fracStr := strings.TrimRight(string(fracRes), "0")
	return intStr, fracStr
}

// compareAbs compares the absolute values represented by int and fractional parts.
// Returns 1 if a > b, 0 if equal, -1 if a < b.
func compareAbs(aInt, aFrac, bInt, bFrac string) int {
	aIntTrim := strings.TrimLeft(aInt, "0")
	bIntTrim := strings.TrimLeft(bInt, "0")
	if aIntTrim == "" {
		aIntTrim = "0"
	}
	if bIntTrim == "" {
		bIntTrim = "0"
	}
	if len(aIntTrim) > len(bIntTrim) {
		return 1
	} else if len(aIntTrim) < len(bIntTrim) {
		return -1
	} else {
		if aIntTrim > bIntTrim {
			return 1
		} else if aIntTrim < bIntTrim {
			return -1
		}
	}
	// Compare fractional parts by padding to equal length.
	maxFracLen := len(aFrac)
	if len(bFrac) > maxFracLen {
		maxFracLen = len(bFrac)
	}
	aFracPadded := aFrac + strings.Repeat("0", maxFracLen-len(aFrac))
	bFracPadded := bFrac + strings.Repeat("0", maxFracLen-len(bFrac))
	if aFracPadded > bFracPadded {
		return 1
	} else if aFracPadded < bFracPadded {
		return -1
	}
	return 0
}
