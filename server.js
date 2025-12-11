const express = require('express');
const fetch = require('node-fetch');
const path = require('path'); 
const app = express();
const port = 3000;

app.use(express.json());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

async function getVidflyDataFormatted(videoId) {
    try {
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const encodedUrl = encodeURIComponent(youtubeUrl);
        
        const apiUrl = `https://api.vidfly.ai/api/media/youtube/download?url=${encodedUrl}`;

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Node.js Server Fetcher'
            }
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        
        if (!data || !data.data || !data.data.items) {
            return null;
        }

        const title = data.data.title || "タイトルなし";
        const links = [];

        data.data.items.forEach(item => {
            if (!item.url) return;

            let label = item.label || "No label";
            const lowerLabel = label.toLowerCase();
            let fileType = "";
            
            if (lowerLabel.includes('mp4') || lowerLabel.includes('webm')) {
                fileType = "（動画）";
            } else if (lowerLabel.includes('mp3') || lowerLabel.includes('m4a') || lowerLabel.includes('opus')) {
                fileType = "（音声）";
            }

            if (item.type === "video_with_audio") {
                label = label + "（音声付き）";
            } else {
                label = label + fileType;
            }

            links.push({
                url: item.url,
                label: label
            });
        });

        return {
            title: title,
            links: links
        };

    } catch (e) {
        console.error("Vidfly processing error:", e);
        return null;
    }
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


app.get('/api/video', async (req, res) => {
    const videoId = req.query.id;

    if (!videoId || !videoId.match(/^[A-Za-z0-9_-]{11}$/)) {
        return res.status(400).json({ 
            error: "無効な動画IDです。11文字のIDをクエリパラメータ 'id' で指定してください。" 
        });
    }

    try {
        const result = await getVidflyDataFormatted(videoId);

        if (result) {
            res.status(200).json(result);
        } else {
            res.status(404).json({ 
                error: "指定された動画IDの情報が見つかりませんでした。" 
            });
        }
    } catch (error) {
        console.error('Server error during data fetch:', error);
        res.status(500).json({ 
            error: "サーバー内部でエラーが発生しました。" 
        });
    }
});

app.listen(port, () => {
    console.log(`サーバーが起動しました: http://localhost:${port}`);
    console.log(`Webページは http://localhost:${port}/ からアクセスできます。`);
});
