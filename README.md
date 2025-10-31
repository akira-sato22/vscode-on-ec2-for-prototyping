# Visual Studio Code on EC2 (カスタマイズ版)

このリポジトリは [aws-samples/vscode-on-ec2-for-prototyping](https://github.com/aws-samples/vscode-on-ec2-for-prototyping) をフォークし、機能を拡張したものです。

**オリジナル版のドキュメント**: [README.original.md](README.original.md) をご参照ください。

## オリジナル版からの主な変更点

### 1. 複数インスタンス対応
複数のVSCodeインスタンスを同時にデプロイできるようになりました。開発環境、検証環境など、用途に応じて複数の独立した環境を構築できます。

### 2. 開発ツールの大幅拡充
EC2インスタンスには以下の開発ツールがプリインストールされています：

#### インフラストラクチャツール
- **AWS CDK**: インフラをコードとして管理
- **Terraform**: マルチクラウド対応のIaCツール
- **AWS SAM CLI**: サーバーレスアプリケーションの開発・デプロイ

#### コンテナ関連
- **Docker**: コンテナランタイム
- **Docker Compose V2**: マルチコンテナアプリケーションの管理

#### 言語・ランタイム
- **Node.js**: nvm経由でインストール（バージョン指定可能）
- **Python 3 & pip**: Python開発環境

#### その他
- **AWS CLI**: 最新版
- **Git**: バージョン管理
- **Visual Studio Code**: ブラウザからアクセス可能

すべてのツールは `ec2-user` で即座に利用可能で、AdministratorAccess相当の権限でAWSリソースを操作できます。

## 前提条件

- Node.js実行環境
- [`aws` コマンド](https://aws.amazon.com/jp/cli/) (AdministratorAccess相当の権限が必要)
- `git` コマンド
- `jq` コマンド (session.sh実行時に必要)

手元に環境を用意するのが難しい場合は [CloudShell](https://console.aws.amazon.com/cloudshell/home) で代替可能ですが、`session.sh` 以降の手順は手元で実行する必要があります。

## インストール

### 1. リポジトリのクローン

```bash
git clone <このリポジトリのURL>
cd vscode-on-ec2-for-prototyping
```

### 2. 依存関係のインストール

```bash
npm ci
```

### 3. CDK Bootstrap（初回のみ）

CDKを初めて使用する場合は、以下のコマンドを実行してください：

```bash
npx cdk bootstrap
```

### 4. デプロイ

```bash
npx cdk deploy
```

デプロイが完了すると、作成されたインスタンスのInstance IDとPrivate IPが出力されます。

### 5. VSCodeへの接続

EC2インスタンスのStatus checkが `checks passed` になったことを確認してから、以下のコマンドでセッションを作成します：

```bash
./session.sh <インスタンス番号>
```

例：
```bash
./session.sh 1  # 1番目のインスタンスに接続（ポート: 8080）
./session.sh 2  # 2番目のインスタンスに接続（ポート: 8081）
```

セッションが確立されたら、ブラウザで以下にアクセスしてください：
- インスタンス1: http://localhost:8080
- インスタンス2: http://localhost:8081
- （以降、8080 + インスタンス番号）

#### Unix系コマンドが使えない場合

以下のコマンドを手動で実行してください：

```bash
# ap-northeast-1 リージョンの場合
aws ssm start-session \
    --region ap-northeast-1 \
    --target <Instance ID> \
    --document-name AWS-StartPortForwardingSessionToRemoteHost \
    --parameters "portNumber=8080,localPortNumber=8080,host=<Private IP>"
```

Instance IDとPrivate IPは、`cdk deploy`時の出力、またはマネージメントコンソールで確認できます。

## 設定のカスタマイズ

[cdk.json](cdk.json) の `context` セクションで以下の値を変更できます：

- `volume`: EC2インスタンスのストレージサイズ（GB）- デフォルト: 128
- `nvm`: nvmのバージョン - デフォルト: 0.39.7
- `node`: Node.jsのバージョン - デフォルト: 20.11.0

インスタンス数を変更する場合は、[bin/vscode-on-ec2-for-prototyping.ts](bin/vscode-on-ec2-for-prototyping.ts) の `instanceCount` パラメータを変更してください。

## インストール済みツールの使用例

### AWS CDKでインフラを構築

```bash
# 新しいCDKプロジェクトを作成
mkdir my-cdk-project && cd my-cdk-project
cdk init app --language typescript
```

### Dockerコンテナの実行

```bash
# Dockerの動作確認
docker run hello-world

# Docker Composeの使用
docker compose version
```

### Terraformでインフラ管理

```bash
# Terraformの初期化
terraform init

# プランの確認
terraform plan
```

### AWS SAM CLIでサーバーレス開発

```bash
# SAMアプリケーションの初期化
sam init

# ローカルでのテスト
sam local start-api
```

## トラブルシューティング

### VSCodeに接続できない場合

[こちらのIssue](https://github.com/amazonlinux/amazon-linux-2023/issues/397) と同様の現象が発生することがあります。

#### 解決手順：

1. マネージメントコンソールからEC2インスタンスに接続（Session Manager経由）
2. 以下のコマンドでログを確認：

```bash
sudo cat /var/log/cloud-init-output.log
```

3. `[Errno 2] No such file or directory: '/var/cache/dnf/amazonlinux-...` というエラーがある場合は、以下を実行：

```bash
# codeの再インストール
sudo yum install -y code

# code-serverの起動
sudo systemctl start code-server
```

4. 再度 `session.sh` でセッションを作成し、ブラウザでアクセス

## クリーンアップ

環境を削除する場合は、以下のコマンドを実行してください：

```bash
npx cdk destroy
```

## 参考情報

- オリジナル版のREADME: [README.original.md](README.original.md)
- オリジナルリポジトリ: [aws-samples/vscode-on-ec2-for-prototyping](https://github.com/aws-samples/vscode-on-ec2-for-prototyping)

## セキュリティ

セキュリティに関する情報は [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) をご覧ください。

## ライセンス

このライブラリはMIT-0ライセンスの下でライセンスされています。詳細はLICENSEファイルをご覧ください。

