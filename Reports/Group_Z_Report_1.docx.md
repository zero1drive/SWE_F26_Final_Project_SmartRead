**Group Z**

* **SmartRead**

  **Software Requirements Specification** 

**Version 1.0**

                          **Revision History**

 

| Date | Version |             Description | Author |
| ----- | ----- | ----- | ----- |
| 27/Oct/2026 | 1.0 | Initial SRS draft | Group Z |
|   |   |   |   |
|   |   |   |   |
|   |   |   |   |

 

**Table of Contents**

1\.     Introduction                                                                                                                                            4

| 1.1 | Purpose | 4 |
| :---- | :---- | ----: |
| 1.2 | Scope | 4 |
| 1.3 | Definitions, Acronyms, and Abbreviations | 4 |
| 1.4 | References | 4 |
| 1.5 | Overview | 4 |

2\.     Overall Description                                                                                                                                6

2.1      Use-Case Model Survey                                                                                                             6                            

2.2      Assumptions and Dependencies                                                                                                8

3\.     Specific Requirements                                                                                                                          7

3.1      Use-Case Reports                                                                                                                      7

3.2      Supplementary Requirements                                                                                                   17  

4\.     Supporting Information                                                                                                                         19                                                                                               

**Software Requirements Specification**

# **1\.  	 Introduction**

## **1.1  	 Purpose**

This document tells what the Smart Bookstore must do. It tells what users will see, what they can do, and how the system will answer them. The Smart Bookstore is a bookstore program that uses AI. Users can chat with it, log in with their face or voice, look for books with words or pictures, and get book ideas picked just for them. This document tells about all of these things and the rules for them.  
This document tells what each of the four kinds of users can do. The four kinds are the super-user (SU), the visitor (VS), the registered customer (RC), and the VIP customer (VC). It also gives the rules for accounts, money, ratings, comments, warnings, and discounts. It also gives a few other rules. For example, all data must be saved in text files, and the program must run on one computer without paying for any service.  
Different people will use this document in different ways. Our team will use it to know what to build. We will also use it to test that each part works. The instructors will use it to check that our work matches the project spec. The super-user, who is the store owner or manager, can use it to check that the store rules are right.  
 

## **1.2  	 Scope**

The Smart Bookstore is a program that runs on one computer and has a simple window (GUI). The system has four types of users: super-user (SU), visitor (VS), registered customer (RC), and VIP customer (VC). Each type of user can do different things.

The system will do the following things:

1\. The first page will show the top 3 books. RC and VC will see books picked for them, and SU and VS will see the most bought and most viewed books.

2\. The system will have a chat box. The answers will depend on the type of user, so only SU can ask about the finance report.

3\. RC, VC, and SU will log in with their face or their voice.

4\. SU will be able to add new books. Users will be able to browse books by category, author, or time, and they will be able to search by keywords or pictures.

5\. Each RC and VC will have a money balance. If a purchase costs more than the balance, the account will get a \$1 fine. If the balance goes below zero, the account will be suspended until SU reopens it.

6\. Users will be able to rate books from 1 to 5 stars and write comments. Comments from people who bought the book will count more. Books with very high or very low ratings will go on the to-order or no-order list. Bad words will be hidden, and users who write bad comments will get warnings.

7\. An RC will become a VC after more than 3 purchases or more than \$200 spent. A VC will get 10% off every purchase.

8\. The system will answer chat questions using our local store files (RAG). If the answer is not in those files, the system will ask an LLM instead. Every answer will say which one was used.

9\. The system will also have one extra smart feature chosen by our team.

The system does not use a database or paid LLM. We will use a free Ollama LLM, and we will save all data in text files.  
 

## **1.3  	 Definitions, Acronyms, and Abbreviations**

**SRS –**Software Requirements Specification, which is this document.

**SU (super-user) –** This is the store owner or manager, and this user can do everything.

**VS (visitor) –** This is a person who is not registered, and this user can only look around.

**RC (registered customer) –** This is a person who has an account and a money balance.

**VC (VIP customer) –** This is an RC who bought more than 3 times or paid more than \$200, and this user gets 10% off.

**LLM –** This stands for large language model, which is an AI that answers questions.

**Ollama –** This is a free tool that runs an LLM on your own computer.

**RAG –** This means the system first looks for an answer in our local files and then uses what it finds to reply.

**YOLO –** This is a method that helps a computer find and recognize things, such as faces, in pictures.

**GUI –** This stands for graphical user interface, which means the windows and buttons you click.

**No-order list –** This is the list of books that have more than 3 ratings and an average rating below 2\.

**To-order list –** This is the list of books that have more than 3 ratings and an average rating above 4\.

**Taboo words –** These are bad words chosen by SU, and the system replaces them with \*. A comment with more than 3 of them is blocked.

**Warning –** This is given to a user whose comment is blocked. An RC with more than 2 warnings is suspended, and a VC is moved down to RC.

**Suspended –** This means the account cannot log in until SU reopens it.  
 

## **1.4  	 References**

\[PROJ\] “An AI-enabled multimodal smart bookstore (draft).” Project specification; Provided by the course instructor.

\[IEEE\] IEEE Std 830-1993, IEEE Recommended Practice for Software Requirements Specifications. IEEE. Basis for the SRS organization.

\[RUP\] Rational Unified Process, Software Requirements Specification template (use-case based outline). Rational Software / IBM.

\[YOLO\] J. Redmon, S. Divvala, R. Girshick, A. Farhadi. “You Only Look Once: Unified, Real-Time Object Detection.” IEEE CVPR, 2016\. Available at https\://arxiv.org/abs/1506.02640.

\[RAG\] P. Lewis et al. “Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks.” NeurIPS, 2020\. Available at https\://arxiv.org/abs/2005.11401.

\[OLLAMA\] Ollama documentation, available at https\://ollama.com.

\[GUT\] Project Gutenberg, free e-books for populating the catalog, available at https\://www\.gutenberg.org.  
 

## **1.5  	 Overview**

The rest of this document is set up as follows; Section 2 gives the big picture and does not list exact requirements. It shows who uses the system (SU, VS, RC, and VC) and what each of them can do. It also lists what we assume, such as having a local Ollama model, a camera, and a microphone.

Section 3 lists the exact requirements in detail enough for us to build and test the system. Section 3.1 has the use-case reports, which describe what each user can do. Section 3.2 has the other requirements that are not in the use cases. Each requirement has a clear label. Section 4 has extra material, such as an index and appendices, and it says whether the appendices are part of the requirements.

 

# **2\.     Overall Description**

Smartread is a locally hosted bookstore application that combines book discovery, purchasing, reviews, and AI assistance. It supports four user roles with different permissions and uses local files for persistent storage. A digital bookshelf and reading journal allow users to organize their reading and request AI-generated reflection questions. The following subsections summarize the use cases, actors, assumptions, and dependencies.

## **2.1       Use-Case Model Survey**

Use Cases: 

1. For Registered Customers (RC) and VIP Customers (VC) the system should recommend them the top 3 books based on their individual past browsing and purchase history  
2. For Super Users (SU) and Visitors (VS) the system should recommend to them the top three books based on general most browsed and purchased.  
3. The system should provide a chat box for any user to interact with the system. The text box should have unique responses and permissions based on what type of actors are using it.   
4. RC, VC, and SU must be able to login using face recognition and/or audio recordings.   
5. The SU should be able to easily add books to the catalog using a simple GUI.   
6. All other users should be able to easily browse the catalog. They should be able to search by category, author, time, keywords, or pictures.   
7. RC and VC should be able to deposit funds into the system. The system will use these funds when the users want to make a purchase. It should also charge them a 1\$ fee if they do not have sufficient funds for a purchase. Any account in the negative should be suspended and can only be reopened by the SU after a deposit makes the balance positive.   
8. Any user can comment on a book but comments made by users who purchased the book are given more weight.   
9. Any user can rate a book from 1-5 but ratings given by users who have purchased the book are given more weight.   
10. Books with more than three ratings with average review of below 2 should be put on a no order list. Books with more than three ratings with an average of above 4 should be put on a do order list.  
11. The SU should be able to create and edit a list of banned words  
12. If any user uses one of the banned words in a comment it is censored with \*  
13. If a comment has more than three banned words, the comment is removed and the author of that comment will be given a warning. If an RC has more than 2 warnings their account is suspended. If the user is a VC they are demoted to an RC.  
14. If an RC makes more than 3 purchases or spends more than 200\$ they are promoted to a VC with a 10% discount for future purchases.  
15. The system should have some information about the store/team to act as a base for the retrieval-augmented generation (RAG) system.   
16. When the system is processing a query it should check if the question relates to local store/team files. If it is, the system will output the answer stored in the RAG and say that this is the RAG answer.  
17. If the question is unrelated to local store/team files, the system should send the query to an LLM.   
18. All users should be able to access their personal digital bookshelf where they can organize their books and journal their thoughts. The system should also use AI to generate reflection questions based on the user's journal. 

    

    Actors: 

- Registered Customers (RC): A RC is a registered user with their own account and information in the system  
- VIP Customer (VC): A VC is an RC but with the privilege of having a 10% discount on purchases.   
- Super User (SU): The SU is the system admin and has the highest amount of clearance among all users.  
- Visitor (VS): A VS is a non-registered user

  Relationship Between User and Use Case Diagram:


  


## **2.2       Assumptions and Dependencies**

- We will be using a locally hosted GUI  
- We will be using a free Ollama-based LLM instead of paying for one  
- We will not be needing a server, and holding all information in local text files.   
- User has access to a camera and recording device  
- We will need a YOLO-based system to recognize faces and voices  
- We will need to get our own books form free resources to fill our catalog

# **3\.    Specific Requirements**

This section defines Smartread’s detailed functional requirements and supplementary requirements. Section 3.1 describes user interactions and automated processes, including normal flows, exceptions, and outcomes. Section 3.2 specifies requirements for the interface, storage, access control, AI functionality, and reliability.

## **3.1     Use-Case Reports**

This section describes the use cases and automated processes identified in the use-case diagram. The identifiers UC-01 through UC-17 correspond to items 1 through 17 in Section 2.1. Actors include registered customers (RC), VIP customers (VC), super-users (SU), and visitors (VS). Processes labeled as automatic are performed internally by the bookstore system.

### **3.1.1 Personalized Book Recommendations**

Use Case ID: UC-01

Actors: RC, VC

Description: The system displays three recommended books based on the individual customer’s browsing and purchase history.

Preconditions: The customer is authenticated and the catalog is available.

Main Flow:

1. The customer opens the home page.  
2. The system retrieves the customer’s browsing and purchase history.  
3. The system ranks books using that history.  
4. The system displays the top three recommendations.  
5. The customer may select a book to view its details.

   Alternative Flow: If fewer than three books are available, the system displays the available books. The recommendation method for customers without history must be confirmed.

   Postcondition: The customer sees recommendations based on their individual activity.

   ### **3.1.2 General Book Recommendations**

   Use Case ID: UC-02

   Actors: SU, VS

   Description: The system displays three generally popular books based on browsing and purchasing activity.

   Precondition: The catalog is available.

   Main Flow:

1. The user opens the home page.  
2. The system retrieves general browsing and purchasing information.  
3. The system ranks the books using this information.  
4. The system displays the top three books.  
5. The user may select a book to view its details.

   Alternative Flow: If insufficient activity data exists, the system uses a group-approved fallback method. If fewer than three books exist, it displays the available books.

   Postcondition: The user sees generally popular books.

   ### **3.1.3 Interact with the Chat Interface**

   Use Case ID: UC-03

   Actors: RC, VC, SU, VS

   Description: Users submit questions through a chat box and receive responses appropriate to their permissions.

   Precondition: The chat interface is available.

   Main Flow:

1. The user enters a question.  
2. The system determines the user’s role.  
3. The system checks whether the requested information is permitted.  
4. The system processes an authorized question through the query-routing processes described in UC-16 and UC-17.  
5. The system displays the response.

   Alternative Flows:

* If the request is unauthorized, the system does not disclose the restricted information.  
* Financial report information is available to the SU and is not disclosed to RC, VC, or VS.  
* If the question is empty, the system requests a question.  
* If an AI service is unavailable, the system reports the problem.

  Postcondition: The user receives an authorized answer or an explanation of why the request could not be completed.

  To Be Confirmed: The complete role-permission matrix for chat responses.

  ### **3.1.4 Biometric Login**

  Use Case ID: UC-04

  Actors: RC, VC, SU

  Description: Users authenticate using face recognition and/or voice identification.

  Preconditions: The user has an account with enrolled biometric information, and the required capture device is available.

  Main Flow:

1. The user selects the login option.  
2. The system requests a face sample and/or voice recording.  
3. The user provides the required sample.  
4. The system compares it with enrolled information.  
5. The system checks the identified account’s status.  
6. If the account is active, the system grants access with the appropriate permissions.

   Alternative Flows:

* If recognition fails, access is denied and the user may retry.  
* If the account is suspended, login is denied.  
* If the required device is unavailable, the system reports the problem.

  Postcondition: A successful login creates a session with the correct user role.

  ### **3.1.5 Add Books to the Catalog**

  Use Case ID: UC-05

  Actor: SU

  Description: The SU adds books through a graphical interface.

  Precondition: The SU is authenticated.

  Main Flow:

1. The SU opens the add-book form.  
2. The SU enters the required book information, including title, author, category, and price.  
3. The SU supplies available images and supporting information.  
4. The system validates the information.  
5. The SU confirms the submission.  
6. The system saves the book to the catalog.

   Alternative Flows:

* Missing or invalid information must be corrected before saving.  
* If the SU cancels, no book is added.  
* If saving fails, the system reports the failure.

  Postcondition: The new book is available for browsing and searching.

  ### **3.1.6 Browse and Search Books**

  Use Case ID: UC-06

  Actors: RC, VC, SU, VS

  Description: Users browse the catalog and search for books.

  Precondition: The catalog is accessible.

  Main Flow:

1. The user opens the catalog.  
2. The user browses by category, author, or time, or submits keywords or a picture.  
3. For picture searches, the user supplies a cover image or internal figure.  
4. The system retrieves matching books.  
5. The system displays the results.  
6. The user selects a book to view its details.

   Alternative Flows:

* If no matches are found, the system allows the user to change the search.  
* If an image cannot be processed, the system requests another image or search method.

  Postcondition: The user can view matching books and their information.

  ### **3.1.7 Manage Funds and Purchase Books**

  Use Case ID: UC-07

  Actors: RC, VC; SU for account reopening

  Description: Customers deposit funds and purchase books using their account balance.

  Precondition: The customer is authenticated and the account is active.

  Main Flow:

1. The customer views their balance.  
2. If desired, the customer enters and confirms a positive deposit.  
3. The system records the deposit and updates the balance.  
4. The customer selects books and confirms a purchase.  
5. The system calculates the total and applies the VC discount when applicable.  
6. If sufficient funds exist, the system deducts the total and records the purchase.  
7. The system checks promotion eligibility through UC-14.  
8. The system displays the updated balance and purchase result.

   Alternative Flows:

* Invalid deposit amounts are rejected.  
* If a purchase exceeds the balance, the system applies a \$1 fine.  
* Any account with a negative balance is suspended and cannot log in.  
* The customer must ask the SU to reopen the account after a deposit results in a positive balance.

  Postcondition: Completed deposits and purchases are recorded, and applicable account restrictions are applied.

  To Be Confirmed: Whether an insufficient-funds purchase completes or is rejected before the fine is applied.

  ### **3.1.8 Submit a Book Comment**

  Use Case ID: UC-08

  Actors: RC, VC, SU, VS

  Description: Users submit written comments about books.

  Precondition: The selected book exists in the catalog.

  Main Flow:

1. The user opens the book’s details page.  
2. The user enters a comment.  
3. The system checks whether the user purchased the book.  
4. The system processes the comment through UC-12 and UC-13.  
5. If accepted, the system saves and displays the moderated comment.  
6. The system gives purchaser comments greater weight.

   Alternative Flows:

* Empty comments are rejected.  
* Comments exceeding the taboo-word limit are blocked through UC-13.

  Postcondition: An accepted comment is published, or a prohibited comment is blocked.

  To Be Confirmed: How greater weight affects comment ordering or presentation, and how visitor authors are tracked.

  ### **3.1.9 Submit a Book Rating**

  Use Case ID: UC-09

  Actors: RC, VC, SU, VS

  Description: Users rate books from one to five stars.

  Precondition: The selected book exists in the catalog.

  Main Flow:

1. The user selects a rating from one to five stars.  
2. The system validates the rating.  
3. The system determines whether the user purchased the book.  
4. The system assigns greater weight to ratings from purchasers.  
5. The system saves the rating and updates the average.  
6. The system evaluates ordering-list eligibility through UC-10.

   Alternative Flow: Ratings outside the one-to-five range are rejected.

   Postcondition: The accepted rating is stored and the book’s rating information is updated.

   To Be Confirmed: The numerical weighting formula and whether users may replace an earlier rating.

   ### **3.1.10 Update Book Ordering Lists**

   Use Case ID: UC-10

   Type: Automatic system process

   Trigger: A book’s rating information changes.

   Precondition: The book has rating information available for evaluation.

   Main Flow:

1. The system checks the number of ratings.  
2. If the book has more than three ratings, the system checks its average rating.  
3. If the average is below 2, the system places the book on the no-order list.  
4. If the average is above 4, the system places the book on the to-order list.

   Alternative Flow: A book with three or fewer ratings does not qualify for either placement under these rules. An average from 2 through 4 does not trigger either placement.

   Postcondition: Qualifying books are placed on the appropriate ordering list.

   To Be Confirmed: Whether the thresholds use the purchaser-weighted average and how existing list membership changes when ratings change.

   ### **3.1.11 Maintain the Taboo-Word List**

   Use Case ID: UC-11

   Actor: SU

   Description: The SU maintains the list of words used for comment moderation.

   Precondition: The SU is authenticated.

   Main Flow:

1. The SU opens taboo-word management.  
2. The system displays the current list.  
3. The SU adds, edits, or removes a word.  
4. The system validates the change.  
5. The SU confirms the change.  
6. The system saves the updated list for subsequent moderation.

   Alternative Flows:

* Empty or duplicate entries require correction.  
* If the SU cancels, the list remains unchanged.

  Postcondition: The updated list is available to the moderation process.

  ### **3.1.12 Censor Taboo Words**

  Use Case ID: UC-12

  Type: Automatic system process

  Trigger: A user submits a written comment through UC-08.

  Precondition: The taboo-word list is available.

  Main Flow:

1. The system scans the comment for listed words.  
2. The system counts the taboo words.  
3. If the comment does not exceed the blocking threshold, the system replaces each matching word with “\*”.  
4. The system returns the moderated comment for publication.

   Alternative Flows:

* If no taboo words are found, the comment remains unchanged.  
* If more than three taboo words are found, the system processes the comment through UC-13 instead of publishing it.

  Postcondition: An accepted comment does not display the matched taboo words.

  To Be Confirmed: Whether counting uses distinct words or total occurrences, and how capitalization and punctuation are handled.

  **3.1.13 Block Comments and Apply Warnings**

  Use Case ID: UC-13

  Type: Automatic system process affecting comment authors, including RC and VC

  Trigger: A submitted comment contains more than three taboo words.

  Precondition: The comment has been checked against the taboo-word list.

  Main Flow:

1. The system blocks the entire comment.  
2. The system issues one warning to the author.  
3. The system updates the author’s warning count.  
4. If the author is an RC with more than two warnings, the system suspends the account.  
5. If the author is a VC, the system applies the applicable demotion rule.  
6. The system informs the author of the moderation outcome.

   Alternative Flow: A comment containing three or fewer taboo words is processed through UC-12 and does not trigger a warning under this rule.

   Postcondition: The blocked comment is not published, and applicable warnings and account changes are recorded.

   To Be Confirmed: The warning threshold for VC demotion, whether warnings reset after demotion, and how warnings are tracked for visitors.

   **3.1.14 Promote a Registered Customer to VIP**

   Use Case ID: UC-14

   Affected Actor: RC

   Type: Automatic system process

   Trigger: A completed purchase updates an RC’s purchase history.

   Precondition: The customer is currently an RC.

   Main Flow:

1. The system checks the customer’s purchase count and spending total.  
2. If the customer has made more than three purchases or spent more than \$200, the system changes the role to VC.  
3. The system informs the customer of the promotion.  
4. The system applies a 10% discount to future purchases.

   Alternative Flow: If neither condition is satisfied, the customer remains an RC.

   Postcondition: An eligible customer becomes a VC.

   To Be Confirmed: Whether purchase count means transactions or individual books, and how the spending total is calculated.

   **3.1.15 Prepare Local Information for RAG**

   Use Case ID: UC-15

   Type: Internal system preparation process

   Description: Local store and team information is made available for retrieval-augmented generation.

   Precondition: The team has prepared the local information files.

   Main Flow:

1. The system reads the configured local files.  
2. The system prepares their content for retrieval.  
3. The system makes relevant content available to the chat process.

   Alternative Flows:

* If a file is missing or unreadable, the system reports the problem.  
* If no local information is available, the system does not claim to provide a grounded local answer.

  Postcondition: Available local information can be retrieved when processing relevant questions.

  To Be Confirmed: The file format and process for refreshing the retrieval content after files change.

  **3.1.16 Answer a Question Using RAG**

  Use Case ID: UC-16

  Type: Automatic process supporting UC-03

  Trigger: An authorized chat question relates to local store or team information.

  Precondition: Relevant local information is available through UC-15.

  Main Flow:

1. The system identifies the question as related to local information.  
2. The system retrieves relevant content.  
3. The system generates an answer grounded in the retrieved content.  
4. The system displays the answer in the chat box.  
5. The response explicitly identifies that RAG was used.

   Alternative Flows:

* If supporting information cannot be found, the system states that the local information is unavailable.  
* If the question requests restricted information, the system does not disclose it.

  Postcondition: The user receives an authorized answer grounded in local information, or a clear explanation that the information is unavailable.

  **3.1.17 Answer a Question Using the LLM**

  Use Case ID: UC-17

  Type: Automatic process supporting UC-03

  Trigger: An authorized chat question is not related to the local information files.

  Precondition: The configured LLM is available.

  Main Flow:

1. The system determines that the question does not require local retrieval.  
2. The system sends the authorized question to the LLM.  
3. The LLM generates a response.  
4. The system displays the response in the chat box.  
5. The response explicitly identifies that the LLM was used.

   Alternative Flows:

* If the LLM is unavailable or fails to respond, the system reports the problem.  
* Restricted requests are not answered by routing them to the LLM.

  Postcondition: The user receives an LLM-labeled response or an explanation of the failure.

**3.1.18 Manage a Digital Bookshelf and Reading Journal**

Use Case ID: UC-18

Actors: RC, VC, SU, VS

Description: Users organize books in a personal digital bookshelf, record their thoughts, and request AI-generated reflection questions.

Preconditions:

* The catalog is available.  
* Registered users are authenticated to access their saved bookshelf.  
* Visitor access uses temporary session storage, subject to group approval.

  Main Flow:

1. The user opens the digital bookshelf.  
2. The system displays the user’s saved collection or temporary visitor collection.  
3. The user adds a catalog book to a shelf, such as Want to Read, Currently Reading, or Finished.  
4. The user creates or edits a journal entry associated with the book.  
5. The user saves the entry.  
6. If the user requests a reflection question, the system sends the selected journal text to the local LLM.  
7. The system displays an AI-generated question related to the entry.  
8. The user may respond by adding further thoughts to the journal.

   Alternative Flows:

* If the journal entry is empty, the system requests text before generating a reflection question.  
* If the LLM is unavailable, the journal remains usable, but the system reports that reflection questions are unavailable.  
* Visitors are informed that their temporary collection and entries are not retained after the session.  
* The system does not automatically publish journal entries or AI-generated questions.

  Postconditions:

* Authenticated users’ bookshelf and journal changes are saved to their accounts.  
* Visitor changes remain available only during the current session.  
* AI-generated questions are displayed only when requested.

  To Be Confirmed: Whether public profiles and shared journal entries are included. If included, the group must define visibility settings, viewing permissions, spoiler handling, and moderation rules.


**3.2       Supplementary Requirements**

This section describes the additional requirements that support the Smart Bookstore system. These requirements apply to the system as a whole rather than to one specific use case. They explain how the system should handle its interface, data, security, AI features, and overall performance.

**3.2.1 User Interface Requirements**

SR-01: The system must provide a graphical user interface (GUI) that allows users to access the bookstore's main features.

SR-02: The interface must provide access to the home page, book catalog, search function, chat box, login options, and digital bookshelf. Additional features will be available depending on the user's role.

SR-03: The system must display clear messages when an action is successful or unsuccessful. For example, users should receive a message when a purchase is completed, a search finds no results, or a login attempt fails.

SR-04: The interface must allow users to navigate between features without restarting the program.

**3.2.2 Data Storage Requirements**

SR-05: All saved bookstore data must be stored locally using text files instead of a traditional database.

SR-06: The system must store information about books, users, balances, purchases, ratings, comments, and browsing history. It must also store bookshelf collections and journal entries for registered users.

SR-07: When information changes, such as a customer's balance after a purchase or a book's average rating, the system must update the corresponding stored records.

SR-08: The system must preserve saved information when the program is closed and reopened. Visitor bookshelf and journal information will only remain available during the current session, as described in UC-18.

**3.2.3 Security and User Access Requirements**

SR-09: The system must recognize four user roles: super-user (SU), visitor (VS), registered customer (RC), and VIP customer (VC).

SR-10: The system must check a user's role before allowing access to restricted features. For example, only the SU can manage the catalog and access financial reports through the chat system.

SR-11: The system must support face and/or voice recognition for the login process of RC, VC, and SU accounts.

SR-12: Suspended accounts must not be allowed to log in until the SU reopens them.

SR-13: Personal account information, including balances, purchase histories, biometric information, and private journal entries, must not be accessible to unauthorized users.

**3.2.4 AI and Search Requirements**

SR-14: The system must use a locally hosted, free Ollama-based large language model (LLM) for its AI functionality.

SR-15: The system must check whether a user has permission to access the requested information before processing a chat question. It must then check its local information using retrieval-augmented generation (RAG). If the answer cannot be found locally, the system must use the LLM when available and appropriate.

SR-16: Every AI chat response must identify whether the answer came from RAG or the LLM.

SR-17: The system must support searching for books using keywords and images, in addition to browsing by category, author, or time.

SR-18: The system must use the customer's browsing and purchase history to provide personalized book recommendations. Visitors and super-users will receive recommendations based on general bookstore activity.

**3.2.5 Performance and Reliability Requirements**

SR-19: The system must run locally on a single computer without requiring a server or paid AI service.

SR-20: The system must support the main bookstore operations, including browsing, searching, purchasing, managing bookshelves, and updating user information, through the GUI.

SR-21: If a required component, such as the camera, microphone, or local LLM, is unavailable, the system must display an appropriate error message instead of ending unexpectedly. Other features that do not depend on the unavailable component should remain usable.

SR-22: The system must validate user input before saving changes. For example, invalid deposit amounts, missing book information, or ratings outside the 1–5 range must be rejected. A journal entry must also contain text before the system can generate a reflection question from it.

SR-23: The system must keep account balances, purchase histories, book ratings, and saved bookshelf information consistent when changes are made.

**3.2.6 Additional Feature Requirements**

SR-24: The system must provide a personal digital bookshelf where users can organize books into reading categories and write journal entries about their reading experiences.

SR-25: The system must use the local LLM to generate reflection questions based on a user's journal entries when requested. If the LLM is unavailable, the user must still be able to access and edit their journal.

SR-26: Bookshelf collections and journal entries must be saved to the appropriate account for authenticated users. Visitors will use temporary session storage, and their information will not be retained after the session ends. Journal entries and AI-generated reflection questions must not be published automatically.

These supplementary requirements support the use cases described in Section 3.1 and help ensure that the Smart Bookstore operates as one complete system.

# **4\.     Supporting Information**

This section provides a requirement-to-use-case mapping for the Smart Bookstore. The mapping shows how the supplementary requirements in Section 3.2 relate to the use cases described in Section 3.1.

This helps the team identify which features are responsible for meeting each requirement and makes it easier to check that the system covers the project's main functions.

**4.1 Requirement-to-Use-Case Mapping**

| Requirement ID | Requirement Description | Related Use Case(s) |
| :---- | :---- | :---- |
| SR-01 | Graphical user interface | UC-01–UC-18 |
| SR-02 | Access to bookstore features based on role | UC-01, UC-02, UC-03, UC-04, UC-05, UC-06, UC-18 |
| SR-03 | Display success and error messages | UC-03, UC-04, UC-05, UC-06, UC-07, UC-08, UC-13, UC-18 |
| SR-04 | Navigation between features | UC-01, UC-02, UC-03, UC-05, UC-06, UC-18 |
| SR-05 | Local text-file storage | UC-01, UC-02, UC-04, UC-05, UC-07–UC-15, UC-18 |
| SR-06 | Store user and bookstore information | UC-01, UC-02, UC-04, UC-05, UC-07, UC-08, UC-09, UC-18 |
| SR-07 | Update saved information | UC-05, UC-07, UC-08, UC-09, UC-10, UC-11, UC-13, UC-14, UC-18 |
| SR-08 | Preserve saved information | UC-04, UC-05, UC-07–UC-15, UC-18 |
| SR-09 | Support four user roles | UC-01, UC-02, UC-03, UC-04, UC-05, UC-07, UC-18 |
| SR-10 | Restrict access by user role | UC-03, UC-04, UC-05, UC-07, UC-11, UC-16, UC-17 |
| SR-11 | Face and voice login | UC-04 |
| SR-12 | Restrict suspended accounts | UC-04, UC-07, UC-13 |
| SR-13 | Protect personal account information | UC-03, UC-04, UC-07, UC-18 |
| SR-14 | Use locally hosted Ollama LLM | UC-03, UC-17, UC-18 |
| SR-15 | Check permissions and local RAG information before LLM | UC-03, UC-15, UC-16, UC-17 |
| SR-16 | Identify RAG or LLM chat responses | UC-16, UC-17 |
| SR-17 | Keyword and image-based book search | UC-06 |
| SR-18 | Personalized and general book recommendations | UC-01, UC-02 |
| SR-19 | Operate locally without paid services | UC-03, UC-04, UC-15, UC-16, UC-17, UC-18 |
| SR-20 | Support primary bookstore operations | UC-05, UC-06, UC-07, UC-18 |
| SR-21 | Handle unavailable components | UC-03, UC-04, UC-05, UC-06, UC-15, UC-17, UC-18 |
| SR-22 | Validate user input | UC-03, UC-05, UC-07, UC-08, UC-09, UC-11, UC-18 |
| SR-23 | Maintain consistent records | UC-07, UC-09, UC-10, UC-13, UC-14, UC-18 |
| SR-24 | Personal digital bookshelf and reading journal | UC-18 |
| SR-25 | AI-generated reflection questions | UC-18 |
| SR-26 | Bookshelf storage and journal privacy | UC-18 |

**4.2 Mapping Explanation**

The mapping shows that some requirements apply to several use cases, while others are connected to one specific feature.

For example, SR-11 is connected to UC-04 because it describes biometric login. SR-15 is connected to UC-03, UC-15, UC-16, and UC-17 because these use cases work together to process chat questions using RAG and the LLM.

Requirements involving local storage, user permissions, and input validation apply to multiple features because they support the bookstore as a whole.

The digital bookshelf requirements, SR-24 through SR-26, are connected to UC-18. This use case describes how users can organize books, write journal entries, and request AI-generated reflection questions. It also explains the difference between saved collections for registered users and temporary collections for visitors.

**4.3 Supporting Information Status**

The requirement-to-use-case mapping supports the requirements described in Section 3\. It does not create additional requirements.

The team can use this mapping during development and testing to check that the appropriate use cases support each supplementary requirement. The mapping is considered supporting information rather than a separate set of system requirements.

