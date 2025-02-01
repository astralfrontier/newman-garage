Newman Garage
=============

This is a tool for converting Notion pages (and eventually other input formats) into Sentinels of the Multiverse Digital JSON and Card Builder formats.

It is a work in progress.

Development
-----------

You must create an `.env.local` file with values for these variables:

- `VITE_REDIRECT_URI` should point to your URL, such as http://localhost:8888/
- `NOTION_CLIENT_ID` should be the Notion OAuth2 client ID, found at https://www.notion.so/profile/integrations
- `NOTION_CLIENT_SECRET` should be the Notion OAuth2 client secret, found at https://www.notion.so/profile/integrations