import requests
import sys
import json
from datetime import datetime

class LoginPortalAPITester:
    def __init__(self, base_url="https://chat-install.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.token and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    'test': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'test': name,
                'error': str(e)
            })
            return False, {}

    def test_login_valid_credentials(self):
        """Test login with valid admin credentials"""
        success, response = self.run_test(
            "Login with valid admin credentials",
            "POST",
            "api/auth/login",
            200,
            data={"login": "admin", "password": "admin123"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token received: {self.token[:20]}...")
            return True
        return False

    def test_login_with_email(self):
        """Test login with email instead of username"""
        success, response = self.run_test(
            "Login with email",
            "POST",
            "api/auth/login",
            200,
            data={"login": "admin@exemplo.com.br", "password": "admin123"}
        )
        return success

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        success, response = self.run_test(
            "Login with invalid credentials",
            "POST",
            "api/auth/login",
            401,
            data={"login": "admin", "password": "wrongpassword"}
        )
        return success

    def test_login_missing_fields(self):
        """Test login with missing fields"""
        success, response = self.run_test(
            "Login with missing password",
            "POST",
            "api/auth/login",
            422,  # Validation error
            data={"login": "admin"}
        )
        return success

    def test_get_current_user_with_token(self):
        """Test getting current user with valid token"""
        if not self.token:
            print("❌ No token available for user test")
            return False
            
        success, response = self.run_test(
            "Get current user with valid token",
            "GET",
            "api/auth/me",
            200
        )
        return success

    def test_get_current_user_without_token(self):
        """Test getting current user without token"""
        # Temporarily remove token
        temp_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Get current user without token",
            "GET",
            "api/auth/me",
            401
        )
        
        # Restore token
        self.token = temp_token
        return success

    def test_get_current_user_invalid_token(self):
        """Test getting current user with invalid token"""
        success, response = self.run_test(
            "Get current user with invalid token",
            "GET",
            "api/auth/me",
            401,
            headers={'Authorization': 'Bearer invalid_token_here'}
        )
        return success

def main():
    print("🚀 Starting Login Portal API Tests")
    print("=" * 50)
    
    # Setup
    tester = LoginPortalAPITester()
    
    # Test sequence
    tests = [
        tester.test_login_valid_credentials,
        tester.test_login_with_email,
        tester.test_get_current_user_with_token,
        tester.test_login_invalid_credentials,
        tester.test_login_missing_fields,
        tester.test_get_current_user_without_token,
        tester.test_get_current_user_invalid_token,
    ]
    
    # Run all tests
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {e}")
            tester.failed_tests.append({
                'test': test.__name__,
                'error': f"Test crashed: {e}"
            })

    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for failure in tester.failed_tests:
            print(f"   - {failure.get('test', 'Unknown')}: {failure.get('error', failure.get('response', 'Unknown error'))}")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"📈 Success Rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())