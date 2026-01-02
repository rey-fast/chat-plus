import requests
import sys
import json
from datetime import datetime

class AdminCRUDAPITester:
    def __init__(self, base_url="https://chatdesk-6.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.current_user_id = None
        self.test_admin_id = None
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
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

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
            self.current_user_id = response.get('user', {}).get('id')
            print(f"   Token received: {self.token[:20]}...")
            print(f"   Current user ID: {self.current_user_id}")
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
    # Admin CRUD Tests
    def test_get_admins_list(self):
        """Test GET /api/admins - List administrators"""
        if not self.token:
            print("❌ No token available for admin list test")
            return False
            
        success, response = self.run_test(
            "Get administrators list",
            "GET",
            "api/admins",
            200
        )
        
        if success and 'admins' in response:
            print(f"   Found {len(response['admins'])} administrators")
            print(f"   Total: {response.get('total', 0)}")
        
        return success

    def test_create_admin(self):
        """Test POST /api/admins - Create new administrator"""
        if not self.token:
            print("❌ No token available for create admin test")
            return False
        
        admin_data = {
            "name": "Admin Teste",
            "username": "admin_teste",
            "email": "admin.teste@exemplo.com.br",
            "password": "senha123",
            "is_active": True
        }
        
        success, response = self.run_test(
            "Create new administrator",
            "POST",
            "api/admins",
            200,
            data=admin_data
        )
        
        if success and 'id' in response:
            self.test_admin_id = response['id']
            print(f"   Created admin ID: {self.test_admin_id}")
        
        return success

    def test_update_admin(self):
        """Test PUT /api/admins/{id} - Update administrator"""
        if not self.token or not self.test_admin_id:
            print("❌ No token or test admin ID available for update test")
            return False
        
        update_data = {
            "name": "Admin Teste Atualizado",
            "email": "admin.teste.atualizado@exemplo.com.br"
        }
        
        success, response = self.run_test(
            "Update administrator",
            "PUT",
            f"api/admins/{self.test_admin_id}",
            200,
            data=update_data
        )
        
        if success:
            print(f"   Updated admin name: {response.get('name', 'N/A')}")
        
        return success

    def test_self_deactivation_protection(self):
        """Test PUT /api/admins/{current_user_id} with is_active=false (should fail)"""
        if not self.token or not self.current_user_id:
            print("❌ No token or current user ID available for self-deactivation test")
            return False
        
        update_data = {
            "is_active": False
        }
        
        success, response = self.run_test(
            "Try to deactivate own account (should fail)",
            "PUT",
            f"api/admins/{self.current_user_id}",
            400,  # Should return 400 error
            data=update_data
        )
        
        return success

    def test_self_deletion_protection(self):
        """Test DELETE /api/admins/{current_user_id} (should fail)"""
        if not self.token or not self.current_user_id:
            print("❌ No token or current user ID available for self-deletion test")
            return False
        
        success, response = self.run_test(
            "Try to delete own account (should fail)",
            "DELETE",
            f"api/admins/{self.current_user_id}",
            400  # Should return 400 error
        )
        
        return success

    def test_delete_admin(self):
        """Test DELETE /api/admins/{id} - Delete administrator"""
        if not self.token or not self.test_admin_id:
            print("❌ No token or test admin ID available for delete test")
            return False
        
        success, response = self.run_test(
            "Delete test administrator",
            "DELETE",
            f"api/admins/{self.test_admin_id}",
            200
        )
        
        if success:
            print(f"   Successfully deleted admin ID: {self.test_admin_id}")
        
        return success

    def test_bulk_delete_admins(self):
        """Test POST /api/admins/bulk-delete - Delete multiple administrators"""
        if not self.token:
            print("❌ No token available for bulk delete test")
            return False
        
        # First create a couple of test admins
        admin1_data = {
            "name": "Admin Bulk Test 1",
            "username": "admin_bulk1",
            "email": "admin.bulk1@exemplo.com.br",
            "password": "senha123",
            "is_active": True
        }
        
        admin2_data = {
            "name": "Admin Bulk Test 2", 
            "username": "admin_bulk2",
            "email": "admin.bulk2@exemplo.com.br",
            "password": "senha123",
            "is_active": True
        }
        
        # Create first admin
        success1, response1 = self.run_test(
            "Create admin for bulk delete test 1",
            "POST",
            "api/admins",
            200,
            data=admin1_data
        )
        
        # Create second admin
        success2, response2 = self.run_test(
            "Create admin for bulk delete test 2",
            "POST",
            "api/admins",
            200,
            data=admin2_data
        )
        
        if not (success1 and success2):
            print("❌ Failed to create test admins for bulk delete")
            return False
        
        admin_ids = [response1.get('id'), response2.get('id')]
        
        # Now test bulk delete
        success, response = self.run_test(
            "Bulk delete administrators",
            "POST",
            "api/admins/bulk-delete",
            200,
            data=admin_ids
        )
        
        if success:
            print(f"   Deleted {response.get('deleted_count', 0)} administrators")
        
        return success

def main():
    print("🚀 Starting Admin CRUD API Tests")
    print("=" * 50)
    
    # Setup
    tester = AdminCRUDAPITester()
    
    # Test sequence - following the requested flow
    tests = [
        # 1. Login to get token
        tester.test_login_valid_credentials,
        
        # 2. GET /api/admins to see current list and get logged admin ID
        tester.test_get_admins_list,
        
        # 3. POST /api/admins to create a new test admin
        tester.test_create_admin,
        
        # 4. PUT /api/admins/{new_id} to update the created admin
        tester.test_update_admin,
        
        # 5. Try PUT /api/admins/{my_id} with is_active=false (should fail with 400)
        tester.test_self_deactivation_protection,
        
        # 6. Try DELETE /api/admins/{my_id} (should fail with 400)
        tester.test_self_deletion_protection,
        
        # 7. DELETE /api/admins/{new_id} to delete the test admin (should work)
        tester.test_delete_admin,
        
        # 8. Test bulk delete functionality
        tester.test_bulk_delete_admins,
        
        # Additional auth tests
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