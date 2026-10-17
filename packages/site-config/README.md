# Static site configuration

`@arsvine/site-config` owns the source-controlled service topology: stable
origins, service display names, OAuth endpoint derivation, Passkey origin,
resource identifiers, and the published-content pointer key. It contains no
credentials and does not load dotenv.

Deployment secrets, database URLs, storage credentials, session keys, local
ports, and feature switches remain environment-provider inputs. Change this
package only when the actual service topology or protocol-owned constant
changes.
