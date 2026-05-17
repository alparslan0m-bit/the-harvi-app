# Scalability Quality Score: SQL Indexing & RLS Policy Checklists

This document defines the mathematical scoring matrices, RLS security checkpoints, and database optimization criteria used to audit scalability parameters inside the App Factory workspace.

---

## 1. Scalability Quality Formula

Prior to backend provisioning tasks, the AI agent must compute the **Scalability Quality Score (SQS)**:

$$\text{SQS} = 100 - (\text{Missing Indexes} \times 20) - (\text{Inactive RLS} \times 25) - (\text{Direct Reads} \times 15)$$

*   **SQS >= 95**: Approved. Database schema maps are secure and performant.
*   **SQS < 95**: Failed. Database configurations require optimization.

---

## 2. Infrastructure Scalability Grid

The review agent must verify that database structures satisfy these rules:

| Scalability Check | Target Standard | Penalty Value | Corrective Action |
| :--- | :--- | :--- | :--- |
| **SQL Indexing** | Composite indexes created for tables over 10k rows. | -20 if missing | Generate CREATE INDEX statements. |
| **RLS Policy Gates** | Every table declares strict row security policies. | -25 if inactive | Inject RLS policies securing user data. |
| **Connection Pooling**| Client requests routed through transaction pool (port 6543). | -15 if on direct port | Update API database connection settings. |
| **Selective Picks** | Queries select explicit columns (no select("*")). | -15 if unconstrained | Declare explicit string column selections. |

---

## 3. High-Scale Data Safeguards

*   **Query Latency Threshold**: Queries must execute in under 50ms inside the local developer environment.
*   **Safe Client decodes**: All sensitive response objects must be encrypted client-side using XOR ciphers before saving to disk.

---

# Anti-Patterns to Avoid

*   **Exposing System Database Internals**: Displaying raw database constraint codes directly inside user alerts.
    *   *Consequence*: Serious security compromise and complete breakdown of user trust.
*   **Creating Redundant Indexes**: Adding SQL index tags to tables with fewer than 100 rows.
    *   *Consequence*: balloons Postgres memory overhead and slows down row insert/write speeds.
