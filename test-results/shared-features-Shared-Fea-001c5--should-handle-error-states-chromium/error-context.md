# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - heading "LMS" [level=1] [ref=e6]:
          - link "LMS" [ref=e7] [cursor=pointer]:
            - /url: /dashboard
        - navigation "User menu" [ref=e8]:
          - button "Notifications" [ref=e9]:
            - img [ref=e10]
          - generic "Logged in as Admin User" [ref=e13]:
            - generic [ref=e14]: AU
            - generic [ref=e15]: Admin User
          - button "Logout" [ref=e16]:
            - img [ref=e17]
    - generic [ref=e20]:
      - complementary "Main navigation" [ref=e21]:
        - navigation:
          - list
      - main [ref=e22]:
        - generic [ref=e24]: Course not found
    - contentinfo [ref=e25]:
      - paragraph [ref=e27]: © 2025 LMS. All rights reserved.
  - alert [ref=e28]
```