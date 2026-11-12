-- Seed: Sample products
--
-- These are FICTIONAL sample products created for this IT457 project demo.
-- They do NOT represent real Flipkart inventory, pricing, or branding.
--
-- How to run this:
--   1. Run migration `database/migrations/0001_create_products_table.sql`
--      first, if you have not already.
--   2. Open your Supabase project -> "SQL Editor" -> "New query".
--   3. Paste the entire contents of this file and click "Run".
--
-- Safe to re-run: `products.name` has a UNIQUE constraint, so existing rows
-- are matched by name and updated in place instead of being duplicated.

insert into public.products
  (name, category, description, price, image_url, stock_quantity, is_active)
values
  ('Aurora X12 Smartphone', 'Electronics', 'Sample 6.5-inch smartphone with a 5000mAh battery, for demo purposes only.', 24999.00, null, 25, true),
  ('Comet Wireless Earbuds', 'Electronics', 'Sample true-wireless earbuds with active noise cancellation.', 2499.00, null, 60, true),
  ('Zenith Running Shoes', 'Sports', 'Sample lightweight running shoes with a breathable mesh upper.', 3299.00, null, 40, true),
  ('Horizon Cotton T-Shirt', 'Fashion', 'Sample 100% cotton crew-neck t-shirt, regular fit.', 799.00, null, 100, true),
  ('Maple Wood Dining Table', 'Home & Kitchen', 'Sample 6-seater solid wood dining table.', 15999.00, null, 8, true),
  ('Nimbus Non-stick Cookware Set', 'Home & Kitchen', 'Sample 5-piece non-stick cookware set.', 2199.00, null, 35, true),
  ('Pinecrest Mystery Novel', 'Books', 'Sample fictional mystery paperback novel.', 349.00, null, 120, true),
  ('Everyday Living Cookbook', 'Books', 'Sample cookbook with simple everyday recipes.', 499.00, null, 75, true),
  ('Glow Radiance Face Serum', 'Beauty', 'Sample vitamin C face serum, 30ml bottle.', 899.00, null, 50, true),
  ('Buildify Wooden Blocks Set', 'Toys', 'Sample 100-piece wooden building blocks set for kids.', 1199.00, null, 45, true),
  ('Organic Harvest Almonds 500g', 'Grocery', 'Sample pack of roasted almonds, 500 grams.', 459.00, null, 90, true),
  ('TrailBlaze Backpack 40L', 'Sports', 'Sample 40-litre hiking and travel backpack.', 2599.00, null, 30, true)
on conflict (name) do update set
  category = excluded.category,
  description = excluded.description,
  price = excluded.price,
  image_url = excluded.image_url,
  stock_quantity = excluded.stock_quantity,
  is_active = excluded.is_active;
