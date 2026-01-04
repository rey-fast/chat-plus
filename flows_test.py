import requests
import sys
import json
from datetime import datetime

class FlowsAPITester:
    def __init__(self, base_url="https://flow-architect-12.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.current_user_id = None
        self.flow_id = None
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
                    print(f"   Response: {json.dumps(response_data, indent=2)[:300]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:300]}...")
                self.failed_tests.append({
                    'test': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:300]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'test': name,
                'error': str(e)
            })
            return False, {}

    def test_login_admin(self):
        """Test login with admin credentials"""
        success, response = self.run_test(
            "Login with admin credentials",
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

    def test_create_flow(self):
        """Test POST /api/flows - Create a new flow"""
        if not self.token:
            print("❌ No token available for create flow test")
            return False
        
        flow_data = {
            "name": "Fluxo de Teste",
            "description": "Fluxo criado para teste da API",
            "nodes": [],
            "edges": []
        }
        
        success, response = self.run_test(
            "Create new flow",
            "POST",
            "api/flows",
            200,
            data=flow_data
        )
        
        if success and 'id' in response:
            self.flow_id = response['id']
            print(f"   Created flow ID: {self.flow_id}")
        
        return success

    def test_list_flows(self):
        """Test GET /api/flows - List flows"""
        if not self.token:
            print("❌ No token available for list flows test")
            return False
            
        success, response = self.run_test(
            "List flows",
            "GET",
            "api/flows",
            200
        )
        
        if success and 'flows' in response:
            print(f"   Found {len(response['flows'])} flows")
            print(f"   Total: {response.get('total', 0)}")
        
        return success

    def test_get_flow_by_id(self):
        """Test GET /api/flows/{id} - Get flow by ID"""
        if not self.token or not self.flow_id:
            print("❌ No token or flow ID available for get flow test")
            return False
            
        success, response = self.run_test(
            "Get flow by ID",
            "GET",
            f"api/flows/{self.flow_id}",
            200
        )
        
        if success:
            print(f"   Flow name: {response.get('name', 'N/A')}")
            print(f"   Flow ID: {response.get('id', 'N/A')}")
        
        return success

    def test_update_flow_with_nodes_edges(self):
        """Test PUT /api/flows/{id} - Update flow with nodes and edges"""
        if not self.token or not self.flow_id:
            print("❌ No token or flow ID available for update flow test")
            return False
        
        update_data = {
            "name": "Fluxo de Teste Atualizado",
            "nodes": [
                {"id": "node1", "type": "message", "label": "Mensagem de teste"}
            ],
            "edges": []
        }
        
        success, response = self.run_test(
            "Update flow with nodes and edges",
            "PUT",
            f"api/flows/{self.flow_id}",
            200,
            data=update_data
        )
        
        if success:
            print(f"   Updated flow name: {response.get('name', 'N/A')}")
            print(f"   Nodes count: {len(response.get('nodes', []))}")
            print(f"   Edges count: {len(response.get('edges', []))}")
            
            # Verify the nodes were saved correctly
            if response.get('nodes') and len(response['nodes']) > 0:
                node = response['nodes'][0]
                if node.get('id') == 'node1' and node.get('type') == 'message':
                    print(f"   ✅ Node data saved correctly: {node}")
                else:
                    print(f"   ⚠️ Node data may not match expected: {node}")
        
        return success

    def test_get_flow_by_invalid_id(self):
        """Test GET /api/flows/{invalid_id} - Should return 404"""
        if not self.token:
            print("❌ No token available for invalid flow test")
            return False
            
        success, response = self.run_test(
            "Get flow by invalid ID (should return 404)",
            "GET",
            "api/flows/invalid-flow-id-12345",
            404
        )
        
        return success

def main():
    print("🚀 Starting Flows API Tests")
    print("=" * 50)
    
    # Setup
    tester = FlowsAPITester()
    
    # Test sequence - following the requested flow
    tests = [
        # 1. Login with admin credentials
        tester.test_login_admin,
        
        # 2. Create a new flow (POST /api/flows)
        tester.test_create_flow,
        
        # 3. List flows (GET /api/flows)
        tester.test_list_flows,
        
        # 4. Get flow by ID (GET /api/flows/{id})
        tester.test_get_flow_by_id,
        
        # 5. Update flow with nodes and edges (PUT /api/flows/{id})
        tester.test_update_flow_with_nodes_edges,
        
        # 6. Test error case - invalid flow ID
        tester.test_get_flow_by_invalid_id,
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