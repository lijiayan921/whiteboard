package middleware

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"net/http"
	"strings"
	"whiteboard/utils/jwt"
)

// JWT认证中间件
func JWTAuthMiddleware() func(c *gin.Context) {
	return func(c *gin.Context) {
		// websocket token 验证
		protocolToken := c.Request.Header.Get("Sec-WebSocket-Protocol")
		if protocolToken != "" {
			fmt.Println(protocolToken)
			// 按空格分割
			parts := strings.SplitN(protocolToken, " ", 2)
			if !(len(parts) == 2 && parts[0] == "Bearer") {
				c.JSON(http.StatusForbidden, gin.H{
					"code": 400,
					"msg":  "请求头中auth格式有误",
				})
				c.Abort()
				return
			}
			mes, err := jwt.ParseToken(parts[1])
			if err != nil {
				c.JSON(http.StatusForbidden, gin.H{
					"code": 400,
					"mag":  "token无效",
				})
				c.Abort()
				return
			}
			c.Set("name", mes.Name)
			c.Set("id", mes.Id)
			c.Set("token", protocolToken)
			c.Next()
			return
		}

		header := c.Request.Header.Get("Authorization")
		if header == "" {
			c.JSON(http.StatusForbidden, gin.H{
				"code": 400,
				"msg":  "token为空",
			})
			c.Abort()
			return
		}
		// 按空格分割
		parts := strings.SplitN(header, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			c.JSON(http.StatusForbidden, gin.H{
				"code": 200,
				"msg":  "请求头中auth格式有误",
			})
			c.Abort()
			return
		}
		mes, err := jwt.ParseToken(parts[1])
		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{
				"code": 200,
				"mag":  "token无效",
			})
			c.Abort()
			return
		}
		c.Set("name", mes.Name)
		c.Set("id", mes.Id)
		c.Next()
	}
}