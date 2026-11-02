from datetime import date, timedelta
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from .models import ProductDictionary, UserProduct, Area, Unit
from .views import _with_freshness

User = get_user_model()


class SmartFridgeTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password123')
        self.area = Area.objects.create(name='Main Fridge', owner=self.user)
        self.unit = Unit.objects.create(symbol='pcs', is_global=True)

    def test_product_dictionary_creation_with_carbs(self):
        product = ProductDictionary.objects.create(
            name="Test Chocolate",
            barcode="123456789",
            kcal=500,
            proteins=5.0,
            fats=30.0,
            carbs=55.0,
            nutriscore="E",
            icon_number=1,
            user=self.user
        )

        self.assertEqual(product.carbs, 55.0)
        self.assertEqual(product.name, "Test Chocolate")
        self.assertEqual(product.nutriscore, "E")

    def test_with_freshness_logic(self):
        exp_date = date.today() + timedelta(days=30)

        product_dict = ProductDictionary.objects.create(name="Milk", icon_number=1, user=self.user)
        user_product = UserProduct.objects.create(
            quantity=1, price=5.0, expiration_date=exp_date,
            area=self.area, product=product_dict, unit=self.unit
        )

        processed_product = _with_freshness(user_product)

        self.assertEqual(processed_product.freshness_level, 'warning')
        self.assertEqual(processed_product.freshness_percent, int((30 / 365) * 100))

    def test_api_add_product_missing_name(self):
        client = Client()
        client.force_login(self.user)

        response = client.post('/api/add-product/', {
            'product_name': '',
            'area_id': self.area.id,
            'quantity': '1',
            'price': '10.0'
        })

        self.assertEqual(response.status_code, 302)
        self.assertEqual(UserProduct.objects.count(), 0)