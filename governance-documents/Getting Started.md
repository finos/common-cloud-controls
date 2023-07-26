# Using the Community Specification License for your Specification Development Project

## 1. Option 1 - Reference the Official Community Specification Repository

### Step 1.

Create a new repository and include the following files from the FINOS version of the Community Specification 1.0 repository [https://github.com/finos/standards-project-blueprint](https://github.com/finos/standards-project-blueprint):

- **Community Specification Contributor License Agreement.**  The Community Specification Contributor License Agreement is the agreement that binds participants to the legal and governance terms established for the Working Group, and it binds participants to those terms, governance, and agreements in the official Community Specification repository. This ensures consistency for all projects using these agreements and avoids the risk that the terms have been modified. 

- **Scope.md.**  The Scope.md file determines the scope of your Working Group. Items beyond that scope are not subject to licensing obligations established by the Community Specification License.    

- **Notices.md.**  The Notices.md file includes information and notices about the Working Group, including contacts for code of conduct issues, patent exclusions, parties that have specifically notified the community that they are implementing the specification, and parties that have withdrawn from the Working Group.

- **License.md.**  The License.md file includes a statement notifying people that the project is under the Community Specification License, and the license for any source code included with the specification.

### Step 2.

Fill in the required information.

- **Scope.md.**  Complete the Scope.md file, which determines the scope of your Working Group and its patent coverage.

- **Notices.md.** Add the contact(s) for code of conduct issues.

- **License.md.** If any source or sample code will be included in the specification, designate a source code license in the License.md file. The default license for FINOS projects is Apache 2.0, and can only be changed with FINOS Governing Board Approval.

### Step 3.

Develop your specification in that repository. 

## Option 2 - Clone the Community Specification Repository

### Step 1.

Clone the Community Specification 1.0 repository [https://github.com/finos/standards-project-blueprint](https://github.com/finos/standards-project-blueprint) into your new repository.

### Step 2.

Fill in the required information.

- **Scope.md.**  Complete the Scope.md file, which determines the scope of your Working Group and its patent coverage.

- **Notices.md.** Add the contact(s) for code of conduct issues.

- **License.md.** If any source or sample code will be included in the specification, designate a source code license in the License.md file. The default license for FINOS projects is Apache 2.0, and can only be changed with FINOS Governing Board Approval.

### Step 3.

Develop your specification in that repository. 

# Best Practices.

1. **Enrollment via PR and CLA bot.** Ensure that all contributors submit a Pull Request accepting the License terms to the [participants.md](participants.md) file, using the provided [pull request template](https://github.com/finos/standards-project-blueprint/blob/master/.github/PULL_REQUEST_TEMPLATE/default.md). That will trigger the [EasyCLA](https://easycla.lfx.linuxfoundation.org/) bot to require a **Community Specification Contributor License Agreement** be signed (either by an individual contributor or by a contributor's employer, which covers the employed contributor) and in place prior to making any contribution.

1. **Use for specifications, not code.**  Use the Community Specification License for specification development, not code.

1. **Scope.** Draft the scope with care since it sets the outer bounds of the patent commitments participants make to the specification.  If you draft it too narrowly, you may limit the functionality of the specification, especially as the project progresses.  Draft it too broadly and it may provide a barrier to participation since participants may be unwilling to agree to potentially broad patent commitments.  For guidance on drafting an appropriate Scope, you may find [ISO's guidance (see page 5)](https://www.iso.org/files/live/sites/isoorg/files/archive/pdf/en/how-to-write-standards.pdf "ISO How To Write Standards Guide") helpful.

1.  **Specification format.**  Where appropriate, use the Community Specification Template to draft your specification.

1. **Develop specifications and code in separate repositories.**  Where possible, separate specifications and source code into different repositories, with the specifications under the Community Specification License and the source code under an OSI-approved open source license.  

1. **Develop multiple specifications in separate repositories.** When developing multiple specifications, each individual specification should be in its own repository.
