# WhatsApp Setup

This project uses Meta WhatsApp Cloud API directly. Twilio is not required.

## Required environment variables

Add these WhatsApp variables to your existing `.env` and set:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_API_VERSION` optional, default is `v22.0`
- `DEFAULT_COUNTRY_CODE` optional, default is `+92`
- `WHATSAPP_TEMPLATE_LANGUAGE` optional, default is `en`

## Notification behavior

The backend sends WhatsApp notifications for:

- booking pending
- booking confirmed
- booking extended
- booking cancelled

If a phone number is missing, the WhatsApp message is skipped.
If WhatsApp credentials are missing, email notifications still work normally.

## Production template mode

For production, create approved WhatsApp templates in Meta and set these env vars:

- `WHATSAPP_TEMPLATE_BOOKING_PENDING`
- `WHATSAPP_TEMPLATE_BOOKING_CONFIRMED`
- `WHATSAPP_TEMPLATE_BOOKING_EXTENDED`
- `WHATSAPP_TEMPLATE_BOOKING_CANCELLED`

If a template name is configured, the backend tries the approved template first.
If template delivery fails, it falls back to the plain text WhatsApp message.

## Suggested template variables

Use body placeholders in this order.

Pending booking:
1. customer name
2. car name
3. booking id
4. pickup date
5. return date
6. payment or details URL

Confirmed booking:
1. customer name
2. car name
3. booking id
4. pickup date
5. return date
6. bookings URL

Extended booking:
1. customer name
2. car name
3. booking id
4. pickup date
5. new return date
6. updated total amount
7. bookings URL

Cancelled booking:
1. customer name
2. car name
3. booking id
4. pickup date
5. return date
6. bookings URL

## Important note

Meta may restrict free-form business-initiated messages outside the customer service window. Approved templates are the correct production setup for reliable delivery.
