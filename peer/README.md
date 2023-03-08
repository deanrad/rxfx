# 𝗥𝘅𝑓𝑥 `peer`

Can help a mesh of peers coordinate a single LEAD, even as peers come and go. Part of the [𝗥𝘅𝑓𝑥](https://github.com/deanrad/rxfx) family of libraries.

## Demo
[CodeSandbox](https://codesandbox.io/s/rxfx-peer-example-fk32ds)

## Specifications 

```yaml
Describe: createPeer
  State:
    role: LEAD|FOLLOW
  On: Exit
    Condtion: role: LEAD
    Outbox: LEAVE({ origin })
  On: Startup
    Set: role: LEAD
    Outbox:  PROMOTE({ origin, MY_ID })
    When: LEAD role
      Event: PROMOTE({ origin, FOREIGN_ID })
        Outbox: DEMOTE({ target, FOREIGN_ID })
      Event: DEMOTE({ origin, MY_ID })
        Set: role: FOLLOW
    When: FOLLOW role
      Event: LEAVE({ origin })
        Sequence: 
          It: Delay random > 500ms
          Set: role: LEAD
          Outbox: PROMOTE({ origin, MY_ID })  
```