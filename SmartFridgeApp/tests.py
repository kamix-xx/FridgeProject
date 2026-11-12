from datetime import date, timedelta
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from .models import ProductDictionary, UserProduct, Area, Unit
from .views import _with_freshness, _group_off_category, get_recipe_status

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

    def test_group_off_category_parameterized(self):
        test_cases = [
            (['bread', 'wheat'], 'bakery'),
            (['cow', 'milk'], 'dairy'),
            (['sweet', 'candy'], 'snack'),
            (['beef', 'sausage'], 'meat'),
            (['apple', 'fruit'], 'produce'),
            (['pasta', 'tomato sauce'], 'pantry'),
            (['sparkling', 'water'], 'drink'),
            (['unknown', 'random'], 'other'),
            ([], 'other'),
            (None, 'other'),
        ]

        for tags, expected_category in test_cases:
            with self.subTest(tags=tags):
                self.assertEqual(_group_off_category(tags), expected_category)

    def test_get_recipe_status_parameterized(self):
        test_cases = [
            (True, "OFFICIAL", "Global Recipe"),
            (False, "PENDING", "Pending Verification"),
            (True, "PENDING", "Pending Verification"),
            (False, "UNOFFICIAL", "Private Recipe"),
            (True, "UNOFFICIAL", "Private Recipe"),
        ]

        for is_global, item_status, expected_status in test_cases:
            with self.subTest(is_global=is_global, item_status=item_status):
                class MockUser:
                    is_authenticated = True

                class MockRecipe:
                    def __init__(self, g, s):
                        self.is_global = g
                        self.item_status = s
                        self.user = MockUser()

                mock_recipe = MockRecipe(is_global, item_status)

                self.assertEqual(get_recipe_status(mock_recipe), expected_status)

    def test_api_add_product_input_parsing_parameterized(self):
        test_cases = [
            ('10.50', '5', 10.5, 5),
            ('abc', 'xyz', 0.01, 1),
            ('-5.00', '-10', 0.01, 1),
            ('', '', 0.01, 1),
            ('0', '0', 0.01, 1),
            ('12,99', '2.5', 0.01, 2),
        ]

        client = Client()
        client.force_login(self.user)

        for price_in, qty_in, expected_price, expected_qty in test_cases:
            with self.subTest(price_in=price_in, qty_in=qty_in):
                UserProduct.objects.all().delete()

                client.post('/api/add-product/', {
                    'product_name': 'Testowy Produkt', 'area_id': self.area.id,
                    'price': price_in, 'quantity': qty_in, 'unit_symbol': 'pcs'})

                saved_product = UserProduct.objects.first()

                self.assertIsNotNone(saved_product, "Produkt nie został w ogóle zapisany!")
                self.assertEqual(saved_product.price, expected_price)
                self.assertEqual(saved_product.quantity, expected_qty)
