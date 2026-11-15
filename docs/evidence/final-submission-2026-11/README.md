# Final report experiment evidence

This archive contains selected records used to verify the results in the IT457 Group 21 final report. It is a curated copy of local experiment outputs; the original working files were left untouched. The original experiment run IDs are retained. AWS account numbers, instance and network identifiers, ARNs, IP addresses, and load-balancer DNS names are redacted in these public copies.

## Fixed-capacity comparison and overload run

`fixed-capacity/` contains the k6 summary and JSON output, sampled AWS state, and scaling activity records for the one-backend and two-backend 4 requests/second comparison, plus the separate 8 requests/second overload run. The overload result is reported separately and is not pooled with the comparison.

## HTTP-driven scale-out run

`http-scale-out/` contains the 5 requests/second, seven-minute k6 summary and JSON output, sampled target/ASG state, exported scaling activities and alarm history, post-test observations, and the CloudWatch CPU chart. The run reports high failure during overload; the scaling event is evidence that capacity reacted, not evidence that requests were error-free during scale-out.

The evidence describes completed experiments from November 2026. AWS resources were subsequently stopped; this archive does not indicate that the deployment is currently online.
