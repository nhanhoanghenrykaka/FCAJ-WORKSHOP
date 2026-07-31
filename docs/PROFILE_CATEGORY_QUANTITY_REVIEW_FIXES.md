# Profile, category, quantity and review fixes

- Profile images for both CUSTOMER and ADMIN are now uploaded to the Shopsflow backend instead of relying on a Cloudinary unsigned preset. The image URL is stored on the user record and the image file is kept in the `shopsflow_uploads` Docker volume, so normal container rebuilds do not remove it.
- Admin navigation now places Categories before Products.
- Each category has a View products action that opens Products filtered to that category.
- Product quantity selection now exposes every unit currently in stock instead of stopping at 10.
- Admin review product rows only emphasize the review count when that product has unread reviews. Opening the product review list marks those reviews as read for the current admin.
- The Admin Orders Action column is intentionally retained.
