#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <instance-number>"
  echo "Example: $0 1"
  exit 1
fi

INSTANCE_NUM=$1
REGION="ap-northeast-1"
LOCAL_PORT=$((8079 + INSTANCE_NUM))

# Check if the CloudFormation stack exists
STACK=`aws cloudformation describe-stacks --region $REGION --stack-name VscodeOnEc2ForPrototypingStack 2>&1`
if [ $? -ne 0 ]; then
  echo "Error: CloudFormation stack 'VscodeOnEc2ForPrototypingStack' does not exist."
  echo ""
  echo "Please deploy the stack first:"
  echo "  cdk deploy"
  exit 1
fi

INSTANCE_ID=`echo $STACK | jq -r ".Stacks[0].Outputs[] | select(.OutputKey == \"InstanceID${INSTANCE_NUM}\") | .OutputValue"`
PRIVATE_IP=`echo $STACK | jq -r ".Stacks[0].Outputs[] | select(.OutputKey == \"PrivateIP${INSTANCE_NUM}\") | .OutputValue"`

if [ -z "$INSTANCE_ID" ] || [ -z "$PRIVATE_IP" ] || [ "$INSTANCE_ID" = "null" ] || [ "$PRIVATE_IP" = "null" ]; then
  echo "Error: Instance #${INSTANCE_NUM} not found in CloudFormation outputs."
  echo ""
  echo "Available instances:"
  echo "$STACK" | jq -r '.Stacks[0].Outputs[] | select(.OutputKey | startswith("InstanceID")) | .OutputKey' | sed 's/InstanceID/  - Instance #/'
  echo ""
  echo "Please check the instance number and try again."
  exit 1
fi

echo "Instance #${INSTANCE_NUM}"
echo "Instance ID: ${INSTANCE_ID}"
echo "Private IP: ${PRIVATE_IP}"
echo "Local Port: ${LOCAL_PORT}"
echo ""
echo "Starting port forwarding session..."
echo "Access VSCode at: http://localhost:${LOCAL_PORT}"
echo "Press Ctrl+C to terminate the session."
echo ""

aws ssm start-session \
    --region $REGION \
    --target $INSTANCE_ID \
    --document-name AWS-StartPortForwardingSessionToRemoteHost \
    --parameters "portNumber=8080,localPortNumber=${LOCAL_PORT},host=${PRIVATE_IP}"
