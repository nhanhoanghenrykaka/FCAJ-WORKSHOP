# Product reviews moved to Order Detail

Customer review creation/edit/delete now lives in `/orders/:id` after the order has been delivered.

- Product detail pages continue to show published customer reviews and average rating.
- The write/edit review form was removed from Product Detail.
- In Order Detail, `Review products` appears beside `Return this order` for eligible order statuses.
- Multi-product orders provide a Product selector so each purchased product can be reviewed individually.
- Existing reviews can be edited or deleted from the same Order Detail card.
- Backend verified-purchase review rules remain unchanged.
