# Third-party notices

Hospiq source is licensed under ISC. Dependencies retain their own licenses and copyright notices. The table below records the direct installed dependencies and development tools at documentation time; it does not replace their full license texts or constitute a complete transitive distribution notice bundle.

| Package | Installed version | Package license declaration | Used by |
|---|---|---|---|
| @emotion/react | 11.14.0 | MIT | client |
| @emotion/styled | 11.14.1 | MIT | client |
| @mui/icons-material | 7.2.0 | MIT | client |
| @mui/material | 7.2.0 | MIT | client |
| @vitejs/plugin-react | 4.6.0 | MIT | client |
| axios | 1.21.0 | MIT | client |
| bcryptjs | 3.0.2 | BSD-3-Clause | server |
| cloudinary | 2.11.0 | MIT | server |
| cors | 2.8.5 | MIT | server |
| date-fns | 4.1.0 | MIT | client |
| dotenv | 17.2.0 | BSD-2-Clause | server |
| express | 5.1.0 | MIT | server |
| jsonwebtoken | 9.0.2 | MIT | server |
| mongoose | 8.24.8 | MIT | server |
| multer | 2.5.0 | MIT | server |
| nodemailer | 10.3.1 | MIT-0 | server |
| nodemon | 3.1.10 | MIT | server |
| qrcode | 1.5.4 | MIT | server |
| qrcode.react | 4.2.0 | ISC | client |
| react | 19.1.0 | MIT | client |
| react-dom | 19.1.0 | MIT | client |
| react-router-dom | 7.18.5 | MIT | client |
| vite | 7.3.7 | MIT | client |

For exact resolved dependency trees, see `client/package-lock.json` and `server/package-lock.json`. Inspect each installed package’s LICENSE/COPYING/NOTICE files and include applicable notices when redistributing source or bundles. Rerun dependency review when the lockfiles change.

Hospiq is not endorsed by the listed projects or providers. The demo facility and clinician names represent fictional test records. No third-party stock imagery is bundled by this documentation update. External README badge images are served by Shields.io; the application logo is the local SVG in `client/public/hospiq.svg`.
