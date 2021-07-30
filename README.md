# Câu chuyện Regex trong Nodejs

Chắc mọi người đã không còn quá lạ lẫm với Regex (Regular Expression) để xử lý chuỗi.

Hãy cùng xem qua ví dụ này để thấy được sự thần kì của `Regex` nhé:

```
const s = "Now is 17:50, and I will go out in 18:30";

// Cách nhanh nhất để lấy ra được 2 khung giờ trong câu trên là dùng regex
const regex = /[0-9]?[0-9]:[0-9][0-9]/g;

const result = s.match(regex);
console.log(result);
//[ '17:50', '18:30' ]
```

Quá easy, chỉ vài dòng lệnh đơn giản thì mình đã lấy ra được thời gian trong câu trong một nốt nhạc.

Và nếu bạn chưa từng biết qua Regex, hoặc là thấy nó quá khó để hiểu (đây là ngôn ngữ của loài người nha các bạn) thì có thể xem qua bài hướng dẫn này: https://github.com/ziishaned/learn-regex (có tiếng Việt luôn cho ai lười dịch nhé)

---

Ok, vậy thì nếu nó tuyệt vời như vậy thì mình viết bài này làm gì nhỉ 🤔 Dĩ nhiên, sẽ chẳng có gì là hoàn hảo cả, ngay cả mình 😎

Việc dùng regex quá tiện lợi dẫn đến chúng ta sử dụng chúng quá bừa bãi, và nhiều khi là sai cách (miễn là cứ đúng kết quả ta mong muốn thôi) sẽ dẫn đến những hậu quả khôn lường.

Chỉ vài dòng code ở trên có thể xử lý vấn đề của chúng ta nhanh chóng, thì cũng chỉ với vài đoạn code nhỏ có thể làm con server to khỏe của chúng ta điêu đứng.

Cùng nghía qua ví dụ dưới đây nhé 😉

```
...
// Một định nghĩa router trong express để kiểm tra chuỗi gửi lên có phải là một biểu thức toán học hay không
app.post('/check-operations', (req, res) => {
	const { operation } = req.body; 
	const regex = /(\d+[+-]?)+=/gm;
	
	console.time("regex run");
    const matchData = regex.test(operation);
    console.timeEnd("regex run");

    if (matchData) {
        return res.send(matchData);
    }

    res.send("not found");
})
...
```

Giờ thử xem api này của mình có hoạt động đúng không nhé!

```
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"operation":"1+1="}' \
  http://localhost:3000/check-operations
  
// regex run: 0.009ms
// true
```

Ok! Vậy là API đã hoạt động như mình mong muốn và thời gian xử lý cũng không có vấn đề gì cả, quá nhanh gọn.

Giờ thử một trường hợp không thỏa Regex trên xem sao nhé!
```
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"operation":"11113333"}' \
  http://localhost:3000/check-operations
  
// regex run: 0.013ms
// not found
```

Thời gian xử lý có tăng lên một chút, nhưng cũng không quá đáng kể. Vậy thì còn gì mà phải bàn nữa nhỉ 🧐 Thật ra vấn đề sẽ xảy ra nếu đầu vào là chuỗi này `1111111111111111111111113333333`, cùng thử nhé~

```
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"operation":"1111111111111111111111113333333"}' \
  http://localhost:3000/check-operations
  
// regex run: 21828.734ms
// not found
```

Boommmm!!! Thiệt là không thể tin được, cái chuỗi bé tí kia mà làm con server xịn sò của mình mất hẳn 21s để xử lý ư 🤯 Ơ vậy thì khi nó xử lý thì những request khác đến server sẽ như thế nào?

![block event loop](https://i.ibb.co/X7mLSZm/block-event-loop.png)

Và dĩ nhiên là mọi thứ đều bị block hết luôn, mọi người có thể tham khảo ở đây https://nodejs.org/en/docs/guides/dont-block-the-event-loop/#blocking-the-event-loop-redos, vì regex là một tác vụ đồng bộ (sync operation) nên trong trường hợp này nó sẽ block event loop luôn.

Vậy tại sao một regex đơn giản thế kia, cùng với một chuỗi chả có gì phức tạp lại phải tốn nhiều thời gian xử lý như vậy. Câu trả lời chính là cơ chế backtracking của Regex engine (tên của hiện tượng này là Catastrophic backtracking).

Cùng xem qua một chút về cách nó hoạt động nhé.

Chúng ta sẽ dùng một regex `(a+)+b` để so khớp với chuỗi `aaaaab` và không khớp với chuỗi `aaaaaa` và `aaaaaa1b`
Có thể thấy là regex của chúng ta rất bình thường, ở đây có thể thấy như vòng lặp lồng nhau `(a+)+`, và theo kinh nghiệm thì chúng chỉ có độ phức tạp cùng lắm là `O(n ^ 2)`, chẳng đáng ngại lắm nếu chuỗi của ta không quá dài. Nhưng rồi mình đã sai, sai quá sai.

Nếu regex trên áp dụng cho chuỗi so khớp, `aaaaaaaaaaab`, sẽ không có chỉ khó khăn cả, chỉ mất có 6 bước. 
- Đầu tiên `a+` sẽ theo thuộc tính greedy của nó, match tới hết chuỗi kí tự `a`
- Sau đó đến `+`, kiểm tra tiếp theo là kí tự `a`, không khớp
- Engine sẽ lùi lại 1 kí tự
- Sau đó kiểm tra lại `+` khớp với `a`. 
- Và cuối cùng là `b` khớp với kí tự `b` còn lại trong chuỗi, trả kết quả là chuỗi so khớp.

Có thể xem minh họa ở https://regex101.com/r/mesXn7/1 (chọn regex debugger trên sidebar)

![GIF Regex](https://i.ibb.co/WkDBQcK/ezgif-1-e2beb100a2da.gif)

Còn nếu áp dụng với 1 chuỗi không khớp, ở đây mình thêm vào 1 kí tự `1` vào sau các kí tự `a`, `aaaaaaaaaaa1b` thì đã có vấn đề xảy ra. Engine lần này phải mất đến **12277** bước để quyết định là chuỗi không khớp. Vì sao vậy?

Thật ra khi dùng nested repetition (`(a+)+`) thì nó không phải vòng lặp lồng nhau, có thể được hiểu nó như là *"chia chuỗi được so khớp thành số chuỗi con bất kì với độ dài bất kì"*. Với một kết quả của việc đó, regex engine sẽ cần phải check 2^n trường hợp trước khi quyết định chuỗi không khớp.

Ví dụ cách tính số steps như sau:
- Với chuỗi `a1b` thì cần 5 bước qua `a`, 6 bước qua `1b` -> 11 bước (https://regex101.com/r/3WDL2M/1)
- Với `aa1b` thì cần 16 = 5 * 2 + 5 + 1 bước qua `a`, 6 bước `1b` -> 22 bước
- Với `aaa1b` thì cần 39 = 16 * 2 + 5 + 2 bước qua `a`, 6 bước `1b` -> 45 bước
- Với `aaaa1b` thì cần 39 = 39 * 2 + 5 + 3 bước qua `a`, 6 bước `1b` -> 92 bước
- ...

![Regex matching performance](https://i.ibb.co/WvwQNXr/ezgif-1-06c533d57162.gif)

Có thể thấy số bước phải thực hiện tăng theo cấp số nhân, trong trường hợp trên thì ta có công thức tính số bước là:

> S[n] = (S[n - 1] - 6) * 2 + n + 11 với S[0] = 11

Điều này có thể lí giải vì sao khi số kí tự `a` tăng lên thì số lượng bước phải thực hiện để kiểm tra so khớp chuỗi lại tăng đáng sợ như vậy. Chỉ cần tăng từ `aaaaaaaaaaa1b` lên thêm 1 kí tự `a`, tức là tăng 11 kí tự `a` lên 12 kí tự thì số lượng step phải thực hiện là `(12277 - 6) * 2 + 11 + 11 = 24564`, tăng hơn gấp 2 lần.

Vì vậy chỉ cần chuỗi càng dài thì regex pattern này có thể là server của bạn điêu đứng.

Qua đây chúng ta có thể thấy rằng regex cũng không thần thánh như thế, và sử dụng nó không đúng cách cũng rất nguy hiểm, những lỗi này sẽ rất khó để phát hiện nhưng một khi nó xảy ra thì hậu quả sẽ rất nghiêm trọng.

Trong trường hợp muốn sử dụng những pattern trên mà không muốn xảy ra hiện tượng Catastrophic backtracking thì có những cách sau:
- Possesive quantifiers(`.++`, `.*+`): một khi đoạn text nào đã được lấy thì sẽ không quay lui.
- Atomic group(`(?>.+)`): khi đoạn text nào đã match vs atomic group thì khi engine thoát khỏi group sẽ bỏ qua tất cả vị trí backtracking bên trong group (chi tiết xem ở đây: https://www.regular-expressions.info/atomic.html)
- Unrolling the loop: hữu hiệu với các engine không hỗ trợ 2 phương thức ở trên như Javascript. Ý tưởng là tách phần repetition thành một group mà chuỗi được match bởi group này sẽ không bị overlap trong lần lặp tiếp theo:

Ví dụ: Một pattern sẽ bị catastrophic backtracking, dùng để tìm ra 1 chuỗi số mà phía trước và phía sau là khoảng trắng, bên trong có thể chứa dấu , để ngăn cách:
- Cách bình thường: `(?<=\s)(\d+,?)+(?=\s)` (https://regex101.com/r/AKhGvQ/1)
- Dùng phương pháp unrolling the loop: `(?<=\s)(-?\d+(,\d+)*)(?=\s)`(https://regex101.com/r/XxJ7r4/3)
-> lúc này thì chúng ta đã tách phần bắt buộc `\d+` ra riêng, và mỗi lần lặp với một ranh giới rõ ràng là dấu `,`. Như vậy thì mỗi lần lặp lại sẽ bị neo tại dấu `,` và số lần backtracking chỉ bằng với độ dài của chuỗi. Mọi người có thể xem phần debug để hiểu rõ hơn.

Engine Regex của JS không hỗ trợ `atomic group` cũng như `possesive quantifiers` nên nếu muốn tránh backtracking thì chỉ có thể dùng Unrolling the loop hoặc Look Ahead (https://instanceof.me/post/52245507631/regex-emulate-atomic-grouping-with-lookahead)

Ngoài ra đối với Nodejs, có một thư viện có thể giúp hỗ trợ việc validate xem regex pattern có an toàn hay không, mọi người có thể xem qua tại https://github.com/substack/safe-regex.

Chào mọi người, hẹn gặp lại ở những vấn đề trắc trở mà mình gặp tiếp theo nhé!

Reference: 
- https://medium0.com/textmaster-engineering/performance-of-regular-expressions-81371f569698
- http://www.rexegg.com/regex-explosive-quantifiers.html#identifying
- https://instanceof.me/post/52245507631/regex-emulate-atomic-grouping-with-lookahead
- https://swtch.com/~rsc/regexp/regexp1.html
