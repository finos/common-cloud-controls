# Common Entries

This file is a summary of the common capabilities, threats, and controls used in the CCC Taxonomy.

> [!NOTE]
> This is designed to be a quick-view for development or reference purposes, is manually maintained, and is not automatically referenced or ingested by any other part of this codebase.
>
> To help your future self and other contributors, please update this file when adding entries or modifying titles.

## Capabilities

| ID      | Title                                    |
| ------- | ---------------------------------------- |
| CCC.Core.F01 | Encryption in Transit Enabled by Default |
| CCC.Core.F02 | Encryption at Rest Enabled by Default    |
| CCC.Core.F03 | Access/Activity Logs                     |
| CCC.Core.F04 | Transaction Rate Limits                  |
| CCC.Core.F05 | Signed URLs                              |
| CCC.Core.F06 | Identity Based Access Control            |
| CCC.Core.F07 | Event Notifications                      |
| CCC.Core.F08 | Multi-zone Deployment                    |
| CCC.Core.F09 | Monitoring                               |
| CCC.Core.F10 | Logging                                  |
| CCC.Core.F11 | Backup                                   |
| CCC.Core.F12 | Recovery                                 |
| CCC.Core.F13 | Infrastructure as Code                   |
| CCC.Core.F14 | API Access                               |
| CCC.Core.F15 | Cost Management                          |
| CCC.Core.F16 | Budgeting                                |
| CCC.Core.F17 | Alerting                                 |
| CCC.Core.F18 | Versioning                               |
| CCC.Core.F19 | On-demand Scaling                        |
| CCC.Core.F20 | Tagging                                  |
| CCC.Core.F21 | Replication                              |
| CCC.Core.F22 | Location Lock-In                         |
| CCC.Core.F23 | Network Access Rules                     |

## Threats

| ID       | Title                                                          |
| -------- | -------------------------------------------------------------- |
| CCC.TH01 | Access Control is Misconfigured                                |
| CCC.TH02 | Data is Intercepted in Transit                                 |
| CCC.TH03 | Deployment Region Network is Untrusted                         |
| CCC.TH04 | Data is Replicated to Untrusted or External Locations          |
| CCC.TH05 | Data is Corrupted During Replication                           |
| CCC.TH06 | Data is Lost or Corrupted                                      |
| CCC.TH07 | Logs are Tampered With or Deleted                              |
| CCC.TH08 | Cost Management Data is Manipulated                            |
| CCC.TH09 | Logs or Monitoring Data are Read by Unauthorized Users         |
| CCC.TH10 | Alerts are Intercepted                                         |
| CCC.TH11 | Event Notifications are Incorrectly Triggered                  |
| CCC.TH12 | Resource Constraints are Exhausted                             |
| CCC.TH13 | Resource Tags are Manipulated                                  |
| CCC.TH14 | Older Resource Versions are Exploited                          |
| CCC.TH15 | Automated Enumeration and Reconnaissance by Non-human Entities |
| CCC.TH16 | Logging and Monitoring are Disabled                            |
| CCC.TH17 | Unauthorized Network Access via Misconfigured Rules            |

## Controls

| ID      | Title                                                                       |
| ------- | --------------------------------------------------------------------------- |
| CCC.C01 | Prevent Unencrypted Requests                                                |
| CCC.C02 | Ensure Data Encryption at Rest for All Stored Data                          |
| CCC.C03 | Implement Multi-factor Authentication (MFA) for Access                      |
| CCC.C04 | Log All Access and Changes                                                  |
| CCC.C05 | Prevent Access from Untrusted Entities                                      |
| CCC.C06 | Prevent Deployment in Restricted Regions                                    |
| CCC.C07 | Alert on Unusual Enumeration Activity                                       |
| CCC.C08 | Enable Multi-zone or Multi-region Data Replication                          |
| CCC.C09 | Prevent Tampering, Deletion, or Unauthorized Access to Access Logs          |
| CCC.C10 | Prevent Data Replication to Destinations Outside of Defined Trust Perimeter |
| CCC.C11 | Enforce Key Management Policies                                             |
| CCC.C12 | Ensure Secure Network Access Rules                                          |
