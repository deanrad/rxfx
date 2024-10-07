"use strict";(self.webpackChunkdocs_rxfx_dev=self.webpackChunkdocs_rxfx_dev||[]).push([[3625],{8822:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>l,contentTitle:()=>a,default:()=>u,frontMatter:()=>r,metadata:()=>i,toc:()=>c});var o=t(4848),s=t(8453);const r={},a=void 0,i={type:"mdx",permalink:"/dialog-cancelation",source:"@site/src/pages/dialog-cancelation.md",description:"Socratic Dialogue Between a Senior Developer and a Junior React Developer",frontMatter:{},unlisted:!1},l={},c=[];function h(e){const n={code:"code",em:"em",hr:"hr",p:"p",strong:"strong",...(0,s.R)(),...e.components};return(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(n.p,{children:(0,o.jsx)(n.strong,{children:"Socratic Dialogue Between a Senior Developer and a Junior React Developer"})}),"\n",(0,o.jsx)(n.hr,{}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Senior Developer"})," :\nSo, how often do you deal with cancellation of async operations in your current projects?"]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Junior Developer"})," :\nTo be honest, not very often. Most of the time, I just let async tasks run their course. If they\u2019re making an API call or something, I assume they\u2019ll finish eventually, and if the user navigates away, it usually doesn\u2019t affect anything too badly."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Senior Developer"})," :\nHmm, I see. But let me ask you\u2014do you think cancellation is really just an edge case, or could it be more fundamental? Why do you think operating systems have cancellation built into nearly every high-level process?"]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Junior Developer"})," :\nI suppose in an operating system, you need to have that control because there are limited resources, and if one process is hogging them, you can shut it down. But for front-end work, we\u2019re not running processes like that. It\u2019s just some API calls here and there."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Senior Developer"})," :\nTrue, but what happens if you have a series of large network requests, like file uploads or long API fetches, and the user navigates away or triggers another action? Do you really want those requests hanging around, wasting bandwidth or processing power?"]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Junior Developer"})," :\nWell, if the user navigates away, the component gets unmounted, and I assume the request will just resolve eventually. It doesn\u2019t seem like a big deal to me most of the time."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Senior Developer"})," :\nBut what if the request keeps running, tying up network resources and maybe even causing unnecessary battery drain on the user\u2019s device? In an environment like a mobile app, where resources are limited, do you think letting tasks run their course could have a negative impact on user experience?"]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Junior Developer"})," :\nHmm, I hadn\u2019t thought about it from that angle. I guess if the user\u2019s on mobile, you\u2019re right\u2014bandwidth and battery life could be a concern."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Senior Developer"})," :\nExactly. Mobile devices and even modern browsers are designed to conserve resources, and if we don\u2019t cancel tasks that are no longer relevant, we\u2019re wasting those precious resources. Plus, consider this: how many tasks can a device handle at once before the performance starts degrading? Do you think there\u2019s a limit?"]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Junior Developer"})," :\nThere\u2019s definitely a limit, yeah. If too many things are running, performance will start to suffer. But in a typical React app, I don\u2019t see a ton of async tasks happening at once."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Senior Developer"})," :\nMaybe not in a simple app, but imagine a more complex scenario\u2014like multiple API requests being fired off from different components, or handling large amounts of real-time data. What would happen if none of those requests could be canceled?"]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Junior Developer"})," :\nI guess the app could get bogged down with too many requests at once. And I\u2019d have no control over which ones to stop if the user moved to a different part of the app."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Senior Developer"})," :\nExactly. That\u2019s why cancellation is so important\u2014it gives you control. Not just for performance, but to prevent wasting resources. Have you ever had a situation where an outdated request resulted in stale data being shown to the user?"]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Junior Developer"})," :\nYeah, actually, that\u2019s happened a few times. If two requests finish at different times, the older one can sometimes overwrite the newer data. It\u2019s annoying to debug."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Senior Developer"})," :\nThat\u2019s a direct result of not being able to cancel. Imagine if, when the new request started, you could just cancel the previous one. No more stale data. Does that sound like something that could make your code more reliable?"]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Junior Developer"})," :\nDefinitely. Cancelling the outdated request would stop that problem from happening in the first place. So, I guess cancellation isn\u2019t just about performance, but also about making sure the app behaves correctly."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Senior Developer"})," :\nExactly. And think about how cancellation ties into the user\u2019s expectations. If they click a button and it triggers a request, they expect the most recent action to be what matters, right? Would you want the app responding to their ",(0,o.jsx)(n.em,{children:"old"})," action instead of their latest?"]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Junior Developer"})," :\nNo, of course not. That would make it feel slow or unresponsive, like the app\u2019s not keeping up with what they want."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Senior Developer"})," :\nRight. Now, let me ask you\u2014if cancellation is built into operating systems to manage resources and prioritize what\u2019s most important, don\u2019t you think the same should apply to the web? After all, a web app is just another system with processes that need managing. Wouldn\u2019t handling resources carefully be just as important?"]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Junior Developer"})," :\nYeah, that makes sense. We do have limited resources\u2014bandwidth, memory, battery\u2014and just letting tasks run wild could affect performance. I hadn\u2019t really considered that before."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Senior Developer"})," :\nExactly. And here\u2019s another thought: when you're handling resources on a user's device, like making network requests or interacting with storage, do you think it\u2019s respectful of the user\u2019s device to leave requests running that are no longer relevant?"]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Junior Developer"})," :\nNo, it\u2019s not. If we\u2019re running things in the background that the user doesn\u2019t need anymore, that\u2019s wasteful. It could drain their battery or slow down other parts of the app."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Senior Developer"})," :\nRight. So now, do you still think cancellation is just an edge case, or do you see it as more of a fundamental necessity for responsible app development?"]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Junior Developer"})," :\nI\u2019m starting to see it\u2019s more fundamental. It\u2019s not just about a few rare cases\u2014it\u2019s about making sure the app uses resources responsibly and keeps up with what the user is doing. Cancellation seems like something I should be handling a lot more often than I thought."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Senior Developer"})," :\nExactly. Cancellation isn\u2019t just for the rare edge case\u2014it\u2019s crucial for ensuring that your app is performant, responsive, and respectful of the resources it\u2019s consuming. Would you say that making cancellation a default part of your async handling could improve the quality of your code?"]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Junior Developer"})," :\nYeah, I think it could. I\u2019ll need to start thinking about it as a fundamental part of my async logic, not just something to handle occasionally."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Senior Developer"})," :\nGreat! You\u2019re thinking about it the right way now. So, what do you think your next steps would be to implement better cancellation handling in your projects?"]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Junior Developer"})," :\nI think I\u2019ll start by using tools like ",(0,o.jsx)(n.code,{children:"RxFx"})," to handle cancellation more gracefully, making sure that when a new request comes in, I can cancel the old one. I\u2019ll also pay more attention to how resources are being used, especially on mobile devices. It\u2019s time to make cancellation a key part of my async handling."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.strong,{children:"Senior Developer"})," :\nExactly! Sounds like you're ready to take control of your async processes like a pro."]})]})}function u(e={}){const{wrapper:n}={...(0,s.R)(),...e.components};return n?(0,o.jsx)(n,{...e,children:(0,o.jsx)(h,{...e})}):h(e)}},8453:(e,n,t)=>{t.d(n,{R:()=>a,x:()=>i});var o=t(6540);const s={},r=o.createContext(s);function a(e){const n=o.useContext(r);return o.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function i(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(s):e.components||s:a(e.components),o.createElement(r.Provider,{value:n},e.children)}}}]);