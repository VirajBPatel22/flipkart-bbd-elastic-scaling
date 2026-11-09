# UI release image scan review — 9 November 2026

Release 520df7c84712 was checked before deployment. ECR basic scanning reports one
CRITICAL finding, CVE-2026-4738, on Alpine zlib 1.3.2-r1 for all four images. Image
index scans were unavailable; the completed scan belongs to the amd64 child manifest.

The official CVE record identifies the affected component as the optional
frmts/zlib/contrib/infback9/inftree9.c code bundled by GDAL. The related upstream
patch also addresses zlib's optional infback9 contribution. This module is distinct
from normal shared-library inflate support.

Inspection of the frontend and monitoring runtime images showed Alpine 3.24.4,
zlib 1.3.2-r1 with only libz.so shared-library files, no installed GDAL package,
and no inflateBack9 symbol string in libz.so.1. Alpine's package recipe builds the
standard configure/make shared library, not contrib/infback9. On that evidence,
this specific affected module is assessed absent from the inspected runtime
packages. This is a component-applicability assessment, not a claim that ECR
returned zero findings. No scanner suppression or certificate/TLS bypass was used.

Sources checked:
- https://raw.githubusercontent.com/CVEProject/cvelistV5/main/cves/2026/4xxx/CVE-2026-4738.json
- https://github.com/OSGeo/gdal/pull/12244
- https://github.com/madler/zlib/pull/1235
- https://raw.githubusercontent.com/alpinelinux/aports/master/main/zlib/APKBUILD

Recheck scans and package contents when changing image digests; do not assume this
assessment applies to future releases or applications that actually use GDAL or
infback9. Application npm dependency installation reported no audit findings.
